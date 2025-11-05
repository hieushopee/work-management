import TinyRichTextEditor from './TinyRichTextEditor'

const RichTextEditor = ({ height = 220, ...props }) => (
  <TinyRichTextEditor height={height} {...props} />
)

export default RichTextEditor
