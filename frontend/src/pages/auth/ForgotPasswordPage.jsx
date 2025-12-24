import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import useUserStore from '../../stores/useUserStore';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const { loading, forgotPassword } = useUserStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await forgotPassword({ email });
        if (result?.success) {
            navigate('/reset-password', { state: { email } });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gradient-to-br from-white via-white to-white relative'>
            {/* Back Arrow */}
            <button
                onClick={() => navigate('/login')}
                className='absolute top-6 left-6 p-2 text-text-secondary hover:text-text-main hover:bg-white rounded-full transition-all'
                title='Back to Login'
            >
                <ArrowLeft className='w-5 h-5' />
            </button>

            <div className='bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 border border-border-light'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4'>
                        <KeyRound className='w-8 h-8 text-primary' />
                    </div>
                    <h1 className='text-3xl font-bold text-text-main mb-2'>Forgot Password</h1>
                    <p className='text-text-secondary text-sm'>
                        Enter your email to receive a reset code
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className='space-y-5'>
                    <div>
                        <label className='block text-sm font-medium text-text-main mb-2'>
                            Email
                        </label>
                        <div className='relative'>
                            <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5' />
                            <input
                                className='w-full pl-10 pr-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                                id='email'
                                name='email'
                                type='email'
                                autoComplete='email'
                                onKeyDown={(e) => e.stopPropagation()}
                                value={email}
                                required
                                autoFocus
                                placeholder='Enter your email address'
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <p className='text-xs text-text-secondary mt-2'>
                            A 6-digit reset code will be sent to your email
                        </p>
                    </div>
                    <button
                        type='submit'
                        className='w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        disabled={loading || !email}
                    >
                        {loading ? (
                            'Sending...'
                        ) : (
                            <>
                                <KeyRound className='w-5 h-5' />
                                Send Reset Code
                            </>
                        )}
                    </button>
                    <div className='text-center'>
                        <Link
                            to='/login'
                            className='text-sm text-primary hover:text-primary-hover font-medium'
                        >
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

