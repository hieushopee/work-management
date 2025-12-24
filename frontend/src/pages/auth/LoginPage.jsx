import React, { useState, useEffect } from 'react'
import { LogIn, Mail, Lock, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import useUserStore from '../../stores/useUserStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
    const navigate = useNavigate();
    const [loginMode, setLoginMode] = useState('password'); // 'password' or 'code'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { loading, createAccessCode, login } = useUserStore();
    const { workspace, getCurrentWorkspace } = useWorkspaceStore();

    useEffect(() => {
        // Get workspace from localStorage or API
        const workspaceId = localStorage.getItem('workspaceId');
        const workspaceName = localStorage.getItem('workspaceName');
        if (workspaceId && workspaceName) {
            useWorkspaceStore.getState().setWorkspace({ id: workspaceId, name: workspaceName });
        } else {
            getCurrentWorkspace();
        }
    }, []);

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        try {
            const workspaceId = workspace?.id || localStorage.getItem('workspaceId');
            const result = await login({ email, password, workspaceId });
            if (result?.success) {
                navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const handleCodeLogin = async (e) => {
        e.preventDefault();
        const workspaceId = workspace?.id || localStorage.getItem('workspaceId');
        const { success } = await createAccessCode({ email, workspaceId });
        if (success) {
            navigate('/verify', { state: { email, workspaceId } });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-white'>
            <div className='bg-white rounded-2xl shadow-soft-xl p-8 w-full max-w-md mx-4 border border-border-light relative'>
                {/* Back Arrow */}
                <button
                    onClick={() => navigate('/create-workspace')}
                    className='absolute top-6 left-6 p-2 text-text-secondary hover:text-primary hover:bg-bg-hover rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary'
                    title='Back to Create Workspace'
                >
                    <ArrowLeft className='w-5 h-5' />
                </button>

                {/* Header */}
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4'>
                        <LogIn className='w-8 h-8 text-primary' />
                    </div>
                    <h1 className='text-3xl font-bold text-text-main mb-2'>Login</h1>
                    <p className='text-text-secondary text-sm'>
                        Welcome back
                    </p>
                </div>
                
                {/* Tabs */}
                <div className='flex bg-bg-secondary rounded-lg p-1 mb-6'>
                    <button
                        type='button'
                        onClick={() => setLoginMode('password')}
                        className={`flex-1 py-2.5 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                            loginMode === 'password'
                                ? 'bg-white text-primary shadow-soft'
                                : 'text-text-secondary hover:text-text-main'
                        }`}
                    >
                        <div className='flex items-center justify-center gap-2'>
                            <Lock className='w-4 h-4' />
                            <span>Password</span>
                        </div>
                    </button>
                    <button
                        type='button'
                        onClick={() => setLoginMode('code')}
                        className={`flex-1 py-2.5 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                            loginMode === 'code'
                                ? 'bg-white text-primary shadow-soft'
                                : 'text-text-secondary hover:text-text-main'
                        }`}
                    >
                        <div className='flex items-center justify-center gap-2'>
                            <KeyRound className='w-4 h-4' />
                            <span>Access Code</span>
                        </div>
                    </button>
                </div>

                {/* Password Login Form */}
                {loginMode === 'password' && (
                    <form onSubmit={handlePasswordLogin} className='space-y-5'>
                        <div>
                            <label className='block text-sm font-medium text-text-main mb-2'>
                                Email
                            </label>
                            <div className='relative'>
                                <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5' />
                                <input
                                    className='w-full pl-10 pr-4 py-3 border border-border-light rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 placeholder:text-text-muted'
                                    id='email'
                                    name='email'
                                    type='email'
                                    autoComplete='email'
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={email}
                                    required
                                    autoFocus
                                    placeholder='Enter your email'
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-text-main mb-2'>
                                Password
                            </label>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5' />
                                <input
                                    className='w-full pl-10 pr-12 py-3 border border-border-light rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 placeholder:text-text-muted'
                                    id='password'
                                    name='password'
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete='current-password'
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={password}
                                    required
                                    placeholder='Enter your password'
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type='button'
                                    onClick={() => setShowPassword(!showPassword)}
                                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-primary transition-all duration-200 active:scale-90 focus:outline-none'
                                >
                                    <div className='relative w-5 h-5'>
                                        <Eye
                                            className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                                                showPassword
                                                    ? 'opacity-0 scale-75 rotate-12'
                                                    : 'opacity-100 scale-100 rotate-0'
                                            }`}
                                        />
                                        <EyeOff
                                            className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                                                showPassword
                                                    ? 'opacity-100 scale-100 rotate-0'
                                                    : 'opacity-0 scale-75 -rotate-12'
                                            }`}
                                        />
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div className='text-right'>
                            <Link
                                to='/forgot-password'
                                className='text-sm text-primary hover:text-primary-hover font-medium transition-colors duration-200'
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <button
                            type='submit'
                            className='w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-soft'
                            disabled={loading || !email || !password}
                        >
                            {loading ? (
                                'Logging in...'
                            ) : (
                                <>
                                    <LogIn className='w-5 h-5' />
                                    Login
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Access Code Login Form */}
                {loginMode === 'code' && (
                    <form onSubmit={handleCodeLogin} className='space-y-5'>
                        <div>
                            <label className='block text-sm font-medium text-text-main mb-2'>
                                Email
                            </label>
                            <div className='relative'>
                                <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5' />
                                <input
                                    className='w-full pl-10 pr-4 py-3 border border-border-light rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 placeholder:text-text-muted'
                                    id='email-code'
                                    name='email'
                                    type='email'
                                    autoComplete='email'
                                    onKeyDown={(e) => e.stopPropagation()}
                                    value={email}
                                    required
                                    autoFocus
                                    placeholder='Enter your email'
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <p className='text-xs text-text-secondary mt-2'>
                                A 6-digit access code will be sent to your email
                            </p>
                        </div>
                        <button
                            type='submit'
                            className='w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-soft'
                            disabled={loading || !email}
                        >
                            {loading ? (
                                'Sending...'
                            ) : (
                                <>
                                    <KeyRound className='w-5 h-5' />
                                    Send Access Code
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default LoginPage
