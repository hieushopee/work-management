import React, { useState } from 'react'
import useUserStore from '../../stores/useUserStore';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');

    const { loading, createAccessCode } = useUserStore();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { success } = await createAccessCode({ email });

        if (success) {
            navigate('/verify', { state: { email } });
        }
    }

    return (
        <div className='flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gray-100'>
            <form onSubmit={handleSubmit} className='bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 space-y-4'>
                <p className='text-center text-3xl font-bold'>Login</p>
                <div className='mb-4'>
                    <input
                        className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                        id='email'
                        name='email'
                        type='email'
                        autoComplete='email'
                        onKeyDown={(e) => e.stopPropagation()}
                        value={email}
                        required
                        autoFocus
                        placeholder='Your email address'
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <button type='submit' className='bg-blue-500 hover:bg-blue-700 text-white w-full font-bold py-2 px-4 rounded' disabled={loading}>{loading ? 'Loading...' : 'Next'}</button>
            </form>
        </div>
    )
}

export default LoginPage
