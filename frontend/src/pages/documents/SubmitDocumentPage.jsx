import UploadDocumentsPage from './UploadDocumentsPage';
import useDocumentStore from '../../stores/useDocumentStore';

const SubmitDocumentPage = () => {
  const { submitDocument } = useDocumentStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Submit Document</h1>
        <p className="text-text-secondary mt-1">Staff can submit documents for approval.</p>
      </div>
      <UploadDocumentsPage
        onSuccess={null}
        hideFooterButtons={false}
        submitDocumentFn={submitDocument}
        buttonLabel="Submit Document"
      />
    </div>
  );
};

export default SubmitDocumentPage;
