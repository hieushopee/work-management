const DeleteConfirmation = ({ setIsOpen, onDelete, itemName, loading }) => {
    return (
        <div className='fixed inset-0 bg-gray-300/50 flex items-center justify-center z-50' onClick={() => setIsOpen({ type: 'create', open: false })}>
            <div className='bg-white p-6 rounded shadow-lg w-md space-y-4' onClick={(e) => e.stopPropagation()}>
                {/* <h2 className='text-xl font-bold text-center'>Delete Confirmation</h2> */}
                <p className=''>Are you sure you want to delete <strong>{itemName}</strong>?</p>
                <div className='flex justify-end gap-2'>
                    <button onClick={() => setIsOpen({ type: 'create', open: false })} className='bg-gray-300 px-4 py-2 rounded cursor-pointer hover:opacity-70 transition-opacity duration-200'>Cancel</button>
                    <button onClick={onDelete} className='bg-red-500 text-white px-4 py-2 rounded cursor-pointer hover:opacity-70 transition-opacity duration-200' disabled={loading}>{ loading ? 'Deleting...' : 'Delete'}</button>
                </div>
            </div>
        </div>
    )
}

export default DeleteConfirmation