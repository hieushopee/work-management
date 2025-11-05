import React, { useEffect, useRef, useState } from 'react'
import { User, Mail, Phone, Building, Briefcase, Edit3, Save, X, Camera, Trash2 } from 'lucide-react'
import useUserStore from '../../stores/useUserStore'
import { DEPARTMENTS } from '../../constants/departments'
import { ROLES } from '../../constants/roles'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

const ProfilePage = () => {
  const { user, editProfile, loading } = useUserStore()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    department: user?.department || '',
    role: user?.role || '',
    avatar: user?.avatar || '',
    slogan: user?.slogan || 'Welcome to your professional profile. Manage your personal information and stay connected with your team.'
  })
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phoneNumber: user?.phoneNumber || '',
        department: user?.department || '',
        role: user?.role || '',
        avatar: user?.avatar || '',
        slogan: user?.slogan || 'Welcome to your professional profile. Manage your personal information and stay connected with your team.'
      })
      setAvatarPreview(user?.avatar || '')
      setAvatarError('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [user, isEditing])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Avatar must be smaller than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result?.toString() || ''
      setAvatarPreview(base64)
      setFormData(prev => ({ ...prev, avatar: base64 }))
      setAvatarError('')
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarClick = () => {
    if (!isEditing) return
    fileInputRef.current?.click()
  }

  const handleAvatarRemove = () => {
    setAvatarPreview('')
    setFormData(prev => ({ ...prev, avatar: '' }))
    setAvatarError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    try {
      await editProfile(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Profile Header */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          <div className="relative px-6 py-6">
            <div className="flex flex-col lg:flex-row items-center lg:items-end space-y-4 lg:space-y-0 lg:space-x-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className={`relative w-20 h-20 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-sm flex items-center justify-center bg-white/10 transition-all duration-300 ${isEditing ? 'cursor-pointer hover:scale-105 hover:shadow-3xl' : 'cursor-default'}`}
                    disabled={!isEditing}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user?.name || 'User avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-white/70" />
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">Change</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Remove button - positioned at top right corner of avatar */}
                  {isEditing && avatarPreview && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                      title="Remove avatar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                {avatarError && (
                  <div className="mt-3 px-3 py-2 bg-red-500/20 text-red-100 rounded-lg text-sm backdrop-blur-sm">
                    {avatarError}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="text-center lg:text-left flex-1">
                <h1 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
                  {user?.name || 'User Name'}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    <Briefcase className="w-4 h-4 mr-2" />
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Role'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                    <Building className="w-4 h-4 mr-2" />
                    {user?.department || 'Department'}
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    name="slogan"
                    value={formData.slogan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-white/30 rounded-xl focus:outline-none focus:ring-4 focus:ring-white/20 focus:border-white/50 transition-all duration-200 bg-white/10 backdrop-blur-sm text-blue-100 placeholder-blue-200 resize-none"
                    placeholder="Write your professional slogan or bio..."
                    rows="2"
                  />
                ) : (
                <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                  {formData.slogan}
                </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Action Bar */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
                <p className="text-gray-600 text-xs">Manage your profile details and preferences</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Fields */}
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Personal Info */}
              <div className="space-y-4">
                {/* Name */}
                <div className="group">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-medium">{user?.name || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-medium">{user?.email || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="group">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                      <Phone className="w-4 h-4 text-purple-600" />
                    </div>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-medium">{user?.phoneNumber || 'Not provided'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Work Info */}
              <div className="space-y-4">
                {/* Department */}
                <div className="group">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                      <Building className="w-4 h-4 text-orange-600" />
                    </div>
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((department) => (
                        <option key={department.value} value={department.value}>
                          {department.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-medium">{user?.department || 'Not assigned'}</p>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div className="group">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-indigo-200 transition-colors">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                    </div>
                    Role
                  </label>
                  {isEditing && user?.role === 'owner' ? (
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50 focus:bg-white"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-medium capitalize">{user?.role || 'Not assigned'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default ProfilePage
