const LoadingSpinner = () => {
	return (
		<div className='flex items-center justify-center min-h-screen bg-white'>
			<div className='relative'>
				<div className='w-20 h-20 border-primary-light border-2 rounded-full' />
				<div className='w-20 h-20 border-primary border-t-2 animate-spin rounded-full absolute left-0 top-0' />
				<div className='sr-only'>Loading</div>
			</div>
		</div>
	);
};

export default LoadingSpinner;