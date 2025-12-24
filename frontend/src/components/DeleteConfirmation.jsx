const DeleteConfirmation = ({ setIsOpen, onDelete, itemName, loading }) => {
    return (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50' onClick={() => setIsOpen({ type: 'create', open: false })}>
            <div className='bg-white p-6 rounded-lg shadow-soft-xl border border-border-light w-md space-y-4' onClick={(e) => e.stopPropagation()}>
                {/* <h2 className='text-xl font-bold text-center'>Delete Confirmation</h2> */}
                <p className='text-text-main'>Are you sure you want to delete <strong className="text-primary">{itemName}</strong>?</p>
                <div className='flex justify-end gap-2'>
                    <button onClick={() => setIsOpen({ type: 'create', open: false })} className='bg-white border border-border-light text-text-main px-4 py-2 rounded-lg cursor-pointer hover:bg-bg-hover transition-colors duration-200'>Cancel</button>
                    <button onClick={onDelete} className='bg-red-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-red-600 active:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed' disabled={loading}>{ loading ? 'Deleting...' : 'Delete'}</button>
                </div>
            </div>
        </div>
    )
}

export default DeleteConfirmation