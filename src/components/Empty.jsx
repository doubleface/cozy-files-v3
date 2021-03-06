import styles from '../styles/empty'

import React from 'react'
import { translate } from '../lib/I18n'

const Empty = ({ t, canUpload }) => {
  return (
    <div class={styles['fil-empty']}>
      <h2>{ t('empty.title') }</h2>
      {canUpload && <p>{ t('empty.text')}</p>}
    </div>
  )
}

export default translate()(Empty)
