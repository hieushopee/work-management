import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { Editor } from '@tinymce/tinymce-react'

import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/themes/silver'
import 'tinymce/models/dom'
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/skins/content/default/content.min.css'
import 'tinymce/skins/ui/oxide/content.min.css'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/wordcount'

const toolbar =
  'undo redo | formatselect fontselect fontsizeselect | bold italic underline strikethrough forecolor backcolor | ' +
  'alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | ' +
  'link image table | removeformat searchreplace | fullscreen'

const plugins = [
  'advlist',
  'autolink',
  'lists',
  'link',
  'image',
  'charmap',
  'preview',
  'anchor',
  'searchreplace',
  'visualblocks',
  'code',
  'fullscreen',
  'insertdatetime',
  'media',
  'table',
  'wordcount'
]

const TinyRichTextEditor = forwardRef(function TinyRichTextEditor(
  {
    id,
    label,
    value,
    onChange,
    placeholder = '',
    readOnly = false,
    height = 260,
    className = ''
  },
  ref
) {
  const editorRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus()
    }
  }))

  const initConfig = useMemo(
    () => ({
      height,
      menubar: false,
      toolbar,
      plugins,
      placeholder,
      branding: false,
      statusbar: true,
      resize: true,
      skin: 'oxide',
      content_css: 'default',
      content_style: `
        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1f2933;
        }
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          color: #111827;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        table, th, td {
          border: 1px solid #d1d5db;
        }
        th, td {
          padding: 8px;
        }
        figure.image {
          display: block;
          margin: 0.75rem 0;
          width: 100%;
        }
        figure.image img,
        img {
          width: 100% !important;
          max-width: 100%;
          height: auto !important;
          display: block;
          border-radius: 8px;
        }
        figure.image img {
          object-fit: contain;
        }
        .tox-toolbar__group {
          padding: 0 !important;
        }
      `,
      setup: function (editor) {
        // Add styles to editor UI on init
        editor.on('init', function () {
          const editorContainer = editor.getContainer();
          if (editorContainer) {
            const uiStyle = document.createElement('style');
            uiStyle.textContent = '.tox-toolbar__group { padding: 0 !important; }';
            editorContainer.appendChild(uiStyle);
          }
        });

        // Handle blur event
        editor.on('blur', () => {
          onChange?.(editor.getContent())
        });
      },
      style_formats_merge: false,
      style_formats: [],
      toolbar_mode: 'wrap',
      readonly: readOnly,
      license_key: 'gpl',
      quickbars_insert_toolbar: false,
      quickbars_selection_toolbar: false,
      image_dimensions: false,
      object_resizing: false,
      file_picker_types: 'image',
      images_upload_handler: (blobInfo) =>
        new Promise((resolve, reject) => {
          try {
            const mimeType = blobInfo?.blob()?.type || 'image/png'
            const base64 = blobInfo?.base64?.()
            if (!base64) {
              reject(new Error('Failed to process image'))
              return
            }
            resolve(`data:${mimeType};base64,${base64}`)
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Failed to process image'))
          }
        })
    }),
    [height, placeholder, readOnly, onChange]
  )

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
          {label}
        </label>
      )}
      <Editor
        id={id}
        onInit={(_, editor) => {
          editorRef.current = editor
        }}
        value={value}
        init={initConfig}
        disabled={readOnly}
        onEditorChange={(content) => {
          onChange?.(content)
        }}
      />
    </div>
  )
})

TinyRichTextEditor.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  readOnly: PropTypes.bool,
  height: PropTypes.number,
  className: PropTypes.string
}

export default TinyRichTextEditor
