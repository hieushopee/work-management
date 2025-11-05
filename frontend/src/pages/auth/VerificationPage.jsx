import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import useUserStore from '../../stores/useUserStore';

const VerificationPage = () => {
    const { email } = useLocation().state || {};
    const navigate = useNavigate()

    const { validateAccessCode, loading } = useUserStore();

    const [code, setCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = validateAccessCode({ email, accessCode: code });
        if(res.success) navigate("/")
    }

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gray-100'>
        <form onSubmit={handleSubmit} className='bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4'>
            <p className='text-center text-3xl font-bold'>Email Verification</p>
            <div className='mb-4'>
                <input
                    className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                    id='code'
                    name='one-time-code'
                    type='text'
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    onKeyDown={(e) => e.stopPropagation()}
                    value={code}
                    required
                    autoFocus
                    placeholder='Enter verification code'
                    onChange={(e) => setCode(e.target.value)}
                />
            </div>
            
            <button type='submit' className='bg-blue-500 hover:bg-blue-700 text-white w-full font-bold py-2 px-4 rounded' disabled={loading}>{ loading ? 'Loading...' : 'Submit'}</button>
        </form>
    </div>
    )
}

export default VerificationPage
