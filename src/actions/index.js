/* global cozy */
import { saveFileWithCordova, openFileWithCordova } from '../../mobile/src/lib/filesystem'
import { openWithOfflineError, openWithNoAppError } from '../../mobile/src/actions'

import { ROOT_DIR_ID, TRASH_DIR_ID } from '../constants/config.js'

export const LOCATION_CHANGE = 'LOCATION_CHANGE'
export const OPEN_FOLDER = 'OPEN_FOLDER'
export const OPEN_FOLDER_SUCCESS = 'OPEN_FOLDER_SUCCESS'
export const OPEN_FOLDER_FAILURE = 'OPEN_FOLDER_FAILURE'
export const ABORT_ADD_FOLDER = 'ABORT_ADD_FOLDER'
export const CREATE_FOLDER = 'CREATE_FOLDER'
export const CREATE_FOLDER_FAILURE_GENERIC = 'CREATE_FOLDER_FAILURE_GENERIC'
export const CREATE_FOLDER_FAILURE_DUPLICATE = 'CREATE_FOLDER_FAILURE_DUPLICATE'
export const CREATE_FOLDER_SUCCESS = 'CREATE_FOLDER_SUCCESS'
export const UPLOAD_FILE = 'UPLOAD_FILE'
export const UPLOAD_FILE_SUCCESS = 'UPLOAD_FILE_SUCCESS'
export const TRASH_FILES = 'TRASH_FILES'
export const TRASH_FILES_SUCCESS = 'TRASH_FILES_SUCCESS'
export const TRASH_FILES_FAILURE = 'TRASH_FILES_FAILURE'
export const RESTORE_FILES = 'RESTORE_FILES'
export const RESTORE_FILES_SUCCESS = 'RESTORE_FILES_SUCCESS'
export const RESTORE_FILES_FAILURE = 'RESTORE_FILES_FAILURE'
export const SELECT_FILE = 'SELECT_FILE'
export const UNSELECT_FILE = 'UNSELECT_FILE'
export const UNSELECT_ALL = 'UNSELECT_ALL'
export const DOWNLOAD_SELECTION = 'DOWNLOAD_SELECTION'
export const SHOW_FILE_ACTIONMENU = 'SHOW_FILE_ACTIONMENU'
export const HIDE_FILE_ACTIONMENU = 'HIDE_FILE_ACTIONMENU'
export const DOWNLOAD_FILE = 'DOWNLOAD_FILE'
export const DOWNLOAD_FILE_E_MISSING = 'DOWNLOAD_FILE_E_MISSING'
export const DOWNLOAD_FILE_E_OFFLINE = 'DOWNLOAD_FILE_E_OFFLINE'
export const OPEN_FILE_WITH = 'OPEN_FILE_WITH'
export const OPEN_FILE_E_OFFLINE = 'OPEN_FILE_E_OFFLINE'
export const OPEN_FILE_E_NO_APP = 'OPEN_FILE_E_NO_APP'

const extractFileAttributes = f => Object.assign({}, f.attributes, { id: f._id })
const toServer = f => Object.assign({}, { attributes: f }, { _id: f.id })

export const HTTP_CODE_CONFLICT = 409
const ALERT_LEVEL_ERROR = 'error'

export const downloadFileMissing = () => ({ type: DOWNLOAD_FILE_E_MISSING, alert: { message: 'error.download_file.missing', level: ALERT_LEVEL_ERROR } })
export const downloadFileOffline = () => ({ type: DOWNLOAD_FILE_E_OFFLINE, alert: { message: 'error.download_file.offline', level: ALERT_LEVEL_ERROR } })

export const openFiles = () => {
  return async dispatch => dispatch(openFolder(ROOT_DIR_ID))
}

export const openTrash = () => {
  return async dispatch => dispatch(openFolder(TRASH_DIR_ID))
}

export const openFolder = (folderId) => {
  return async dispatch => {
    dispatch({ type: OPEN_FOLDER, folderId })
    try {
      const folder = await cozy.client.files.statById(folderId)
      const parentId = folder.attributes.dir_id
      const parent = !!parentId && await cozy.client.files.statById(parentId)
      return dispatch({
        type: OPEN_FOLDER_SUCCESS,
        folder: Object.assign(extractFileAttributes(folder), {
          parent: extractFileAttributes(parent)}),
        files: folder.relations('contents').map(
          c => extractFileAttributes(c)
        )
      })
    } catch (err) {
      return dispatch({ type: OPEN_FOLDER_FAILURE, error: err })
    }
  }
}

export const openFileInNewTab = (folder, file) => {
  return async dispatch => {
    const filePath = await cozy.client.files.getFilePath(file, toServer(folder))
    const href = await cozy.client.files.getDownloadLink(filePath)
    window.open(`${cozy.client._url}${href}`, '_blank')
  }
}

export const uploadFile = (file, folder) => {
  return async dispatch => {
    dispatch({ type: UPLOAD_FILE })
    const created = await cozy.client.files.create(
      file,
      { dirID: folder.id }
    )
    dispatch({
      type: UPLOAD_FILE_SUCCESS,
      file: extractFileAttributes(created)
    })
  }
}

export const abortAddFolder = (accidental) => {
  let action = {
    type: ABORT_ADD_FOLDER,
    accidental
  }
  if (accidental) {
    action.alert = {
      message: 'alert.folder_abort'
    }
  }
  return action
}

export const createFolder = name => {
  return async (dispatch, getState) => {
    let existingFolder = getState().view.files.find(f => f.type === 'directory' && f.name === name)

    if (existingFolder) {
      dispatch({
        type: CREATE_FOLDER_FAILURE_DUPLICATE,
        alert: {
          message: 'alert.folder_name',
          messageData: { folderName: name }
        }
      })
      throw new Error('alert.folder_name')
    }

    dispatch({
      type: CREATE_FOLDER,
      name
    })

    let folder
    try {
      folder = await cozy.client.files.createDirectory({
        name: name,
        dirID: getState().view.displayedFolder.id
      })
    } catch (err) {
      if (err.response && err.response.status === HTTP_CODE_CONFLICT) {
        dispatch({
          type: CREATE_FOLDER_FAILURE_DUPLICATE,
          alert: {
            message: 'alert.folder_name',
            messageData: { folderName: name }
          }
        })
      } else {
        dispatch({
          type: CREATE_FOLDER_FAILURE_GENERIC,
          alert: {
            message: 'alert.folder_generic'
          }
        })
      }
      throw err
    }
    dispatch({
      type: CREATE_FOLDER_SUCCESS,
      folder: extractFileAttributes(folder)
    })
  }
}

export const trashFiles = files => {
  return async dispatch => {
    dispatch({ type: TRASH_FILES, files })
    let trashed = []
    try {
      for (let file of files) {
        trashed.push(await cozy.client.files.trashById(file.id))
      }
    } catch (err) {
      return dispatch({
        type: TRASH_FILES_FAILURE,
        alert: {
          message: 'alert.try_again'
        }
      })
    }
    return dispatch({
      type: TRASH_FILES_SUCCESS,
      ids: files.map(f => f.id),
      alert: {
        message: 'alert.trash_file_success'
      }
    })
  }
}

export const restoreFiles = files => {
  return async dispatch => {
    dispatch({ type: RESTORE_FILES, files })
    let restored = []
    try {
      for (let file of files) {
        restored.push(await cozy.client.files.restoreById(file.id))
      }
    } catch (err) {
      return dispatch({
        type: RESTORE_FILES_FAILURE,
        alert: {
          message: 'alert.try_again'
        }
      })
    }
    return dispatch({
      type: RESTORE_FILES_SUCCESS,
      ids: files.map(f => f.id),
      alert: {
        message: 'alert.restore_file_success'
      }
    })
  }
}

export const toggleFileSelection = (file, selected) => ({
  type: selected ? UNSELECT_FILE : SELECT_FILE,
  id: file.id
})

export const unselectAllFiles = () => ({
  type: UNSELECT_ALL
})

export const downloadSelection = selected => {
  return async (dispatch) => {
    if (selected.length === 1 && selected[0].type !== 'directory') {
      return dispatch(downloadFile(selected[0]))
    }
    const paths = selected.map(f => f.path)
    const href = await cozy.client.files.getArchiveLink(paths)
    const fullpath = await cozy.client.fullpath(href)
    forceFileDownload(fullpath, 'files.zip')
    return dispatch({ type: DOWNLOAD_SELECTION, selected })
  }
}

const isMissingFile = (error) => error.status === 404
const isOffline = (error) => error.message === 'Network request failed'

export const downloadFile = file => {
  return async (dispatch) => {
    const response = await cozy.client.files.downloadById(file.id).catch((error) => {
      console.error('downloadById', error)
      if (isMissingFile(error)) {
        dispatch(downloadFileMissing())
      } else if (isOffline(error)) {
        dispatch(downloadFileOffline())
      } else {
        dispatch(downloadFileOffline())
      }
      throw error
    })
    const blob = await response.blob()
    const filename = file.name

    if (window.cordova && window.cordova.file) {
      saveFileWithCordova(blob, filename)
    } else {
      forceFileDownload(window.URL.createObjectURL(blob), filename)
    }
    return dispatch({ type: DOWNLOAD_FILE, file })
  }
}

const forceFileDownload = (href, filename) => {
  const element = document.createElement('a')
  element.setAttribute('href', href)
  element.setAttribute('download', filename)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export const openFileWith = (id, filename) => {
  return async (dispatch, getState) => {
    if (window.cordova && window.cordova.plugins.fileOpener2) {
      dispatch({ type: OPEN_FILE_WITH, id })
      const response = await cozy.client.files.downloadById(id).catch((error) => {
        console.error('downloadById', error)
        if (isMissingFile(error)) {
          dispatch(downloadFileMissing())
        } else if (isOffline(error)) {
          dispatch(openWithOfflineError())
        } else {
          dispatch(openWithOfflineError())
        }
        throw error
      })
      const blob = await response.blob()
      openFileWithCordova(blob, filename).catch((error) => {
        console.error('openFileWithCordova', error)
        dispatch(openWithNoAppError())
      })
    } else {
      dispatch(openWithNoAppError())
    }
  }
}

export const showFileActionMenu = id => ({
  type: SHOW_FILE_ACTIONMENU, id
})

export const hideFileActionMenu = () => ({
  type: HIDE_FILE_ACTIONMENU
})

export const actionMenuLoading = (menu) => ({
  type: 'SHOW_SPINNER',
  menu
})

export const actionMenuLoaded = (menu) => ({
  type: 'HIDE_SPINNER',
  menu
})
