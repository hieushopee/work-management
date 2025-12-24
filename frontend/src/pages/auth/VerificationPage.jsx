import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import useUserStore from '../../stores/useUserStore';

const VerificationPage = () => {
    const { email, workspaceId } = useLocation().state || {};
    const navigate = useNavigate()

    const { validateAccessCode, loading } = useUserStore();

    const [code, setCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalWorkspaceId = workspaceId || localStorage.getItem('workspaceId');
        const res = await validateAccessCode({ email, accessCode: code, workspaceId: finalWorkspaceId });
        if(res.success) navigate("/")
    }

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-white'>
        <form onSubmit={handleSubmit} className='bg-white shadow-soft-xl rounded-2xl border border-border-light px-8 pt-8 pb-8 mb-4 space-y-6 max-w-md w-full mx-4'>
            <div className='text-center mb-6'>
                <h1 className='text-3xl font-bold text-text-main mb-2'>Email Verification</h1>
                <p className='text-sm text-text-secondary'>Enter the code sent to your email</p>
            </div>
            <div className='mb-4'>
                <input
                    className='input shadow-soft w-full py-3 px-4 text-center text-xl tracking-widest font-semibold'
                    id='code'
                    name='one-time-code'
                    type='text'
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    onKeyDown={(e) => e.stopPropagation()}
                    value={code}
                    required
                    autoFocus
                    placeholder='000000'
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                />
            </div>
            
            <button type='submit' className='btn-primary w-full py-3 font-bold shadow-soft' disabled={loading}>{ loading ? 'Verifying...' : 'Verify Code'}</button>
        </form>
    </div>
    )
}

export default VerificationPage
