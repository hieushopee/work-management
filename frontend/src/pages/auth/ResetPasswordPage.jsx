import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import useUserStore from '../../stores/useUserStore';

const ResetPasswordPage = () => {
    const { email } = useLocation().state || {};
    const navigate = useNavigate();
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState('verify'); // 'verify' or 'reset'
    const { loading, verifyResetCode, resetPassword } = useUserStore();

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        const result = await verifyResetCode({ email, resetCode });
        if (result?.success) {
            setStep('reset');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const result = await resetPassword({ email, resetCode, newPassword });
        if (result?.success) {
            navigate('/login');
        }
    };

    if (!email) {
        return (
            <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-white'>
                <div className='bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4 w-full max-w-md text-center'>
                    <p className='text-red-600 mb-4'>Email not found. Please start from Forgot Password page.</p>
                    <Link to='/forgot-password' className='text-blue-500 hover:text-blue-700'>
                        Go to Forgot Password
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-white'>
            <div className='bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4 w-full max-w-md'>
                {step === 'verify' ? (
                    <>
                        <p className='text-center text-3xl font-bold mb-2'>Verify Reset Code</p>
                        <p className='text-center text-text-secondary text-sm mb-6'>
                            Enter the 6-digit code sent to {email}
                        </p>
                        <form onSubmit={handleVerifyCode} className='space-y-4'>
                            <div>
                                <input
                                    className='shadow appearance-none border rounded w-full py-2 px-3 text-text-main leading-tight focus:outline-none focus:shadow-outline text-center text-2xl tracking-widest'
                                    id='resetCode'
                                    name='resetCode'
                                    type='text'
                                    inputMode='numeric'
                                    maxLength={6}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={resetCode}
                                    required
                                    autoFocus
                                    placeholder='000000'
                                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                />
                            </div>
                            <button
                                type='submit'
                                className='bg-blue-500 hover:bg-blue-700 text-white w-full font-bold py-2 px-4 rounded'
                                disabled={loading || resetCode.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <p className='text-center text-3xl font-bold mb-2'>Reset Password</p>
                        <p className='text-center text-text-secondary text-sm mb-6'>
                            Enter your new password
                        </p>
                        <form onSubmit={handleResetPassword} className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-text-main mb-1'>
                                    New Password
                                </label>
                                <input
                                    className='shadow appearance-none border rounded w-full py-2 px-3 text-text-main leading-tight focus:outline-none focus:shadow-outline'
                                    id='newPassword'
                                    name='newPassword'
                                    type='password'
                                    autoComplete='new-password'
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={newPassword}
                                    required
                                    autoFocus
                                    placeholder='Enter new password'
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <p className='text-xs text-text-secondary mt-1'>
                                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                                </p>
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-text-main mb-1'>
                                    Confirm Password
                                </label>
                                <input
                                    className='shadow appearance-none border rounded w-full py-2 px-3 text-text-main leading-tight focus:outline-none focus:shadow-outline'
                                    id='confirmPassword'
                                    name='confirmPassword'
                                    type='password'
                                    autoComplete='new-password'
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={confirmPassword}
                                    required
                                    placeholder='Confirm new password'
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <button
                                type='submit'
                                className='bg-blue-500 hover:bg-blue-700 text-white w-full font-bold py-2 px-4 rounded'
                                disabled={loading || !newPassword || !confirmPassword}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
                <div className='text-center mt-4'>
                    <Link
                        to='/login'
                        className='text-sm text-blue-500 hover:text-blue-700'
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;

