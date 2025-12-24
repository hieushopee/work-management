import React, { useEffect, useRef, useState } from 'react'
import { User, Mail, Phone, Building, Briefcase, Edit3, Save, X, Camera, Trash2, Sparkles } from 'lucide-react'
import useUserStore from '../../stores/useUserStore'
import { DEPARTMENTS } from '../../constants/departments'
import { ROLES } from '../../constants/roles'
import { isAdmin } from '../../utils/roleUtils'

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
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden mb-6 border-2 border-white/50">
          {/* Primary Background */}
          <div className="absolute inset-0 bg-primary">
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='50' cy='50' r='3'/%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          <div className="relative px-8 py-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-end space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className={`relative w-28 h-28 rounded-full overflow-hidden shadow-2xl border-4 border-white transition-all duration-300 ${isEditing ? 'cursor-pointer hover:scale-110 hover:shadow-3xl ring-4 ring-white/50' : 'cursor-default'}`}
                    disabled={!isEditing}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user?.name || 'User avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-light flex items-center justify-center">
                        <User className="w-14 h-14 text-primary" />
                      </div>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white">
                        <Camera className="w-7 h-7 mb-1" />
                        <span className="text-xs font-semibold">Change Photo</span>
                      </div>
                    )}
                  </button>
                  
                  {isEditing && avatarPreview && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="absolute -top-1 -right-1 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 ring-2 ring-white"
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
                  <div className="mt-3 px-4 py-2 bg-red-500 text-white rounded-xl text-sm shadow-lg backdrop-blur-sm">
                    {avatarError}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="text-center lg:text-left flex-1">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                  <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                    {user?.name || 'User Name'}
                  </h1>
                  <Sparkles className="w-6 h-6 text-white/80 animate-pulse" />
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/30 text-white backdrop-blur-md shadow-lg border border-white/20">
                    <Briefcase className="w-4 h-4 mr-2" />
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Role'}
                  </span>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/30 text-white backdrop-blur-md shadow-lg border border-white/20">
                    <Building className="w-4 h-4 mr-2" />
                    {user?.department || 'Department'}
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    name="slogan"
                    value={formData.slogan}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 border-2 border-white/40 rounded-2xl focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white/60 transition-all duration-200 bg-white/20 backdrop-blur-md text-white placeholder-white/70 resize-none shadow-lg"
                    placeholder="Write your professional slogan or bio..."
                    rows="2"
                  />
                ) : (
                  <p className="text-white/95 text-base leading-relaxed max-w-2xl font-medium drop-shadow-md">
                    {formData.slogan}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50">
          {/* Action Bar */}
          <div className="bg-primary px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Personal Information</h2>
                <p className="text-white/90 text-sm">Manage your profile details and preferences</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-6 py-3 bg-white text-primary rounded-xl hover:bg-primary-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 font-semibold hover:scale-105"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold border-2 border-white/30"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-white text-primary rounded-xl hover:bg-primary-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:-translate-y-1 font-semibold hover:scale-105"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Fields */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Personal Info */}
              <div className="space-y-6">
                {/* Name */}
                <div className="group">
                  <label className="flex items-center text-base font-bold text-text-main mb-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 group-hover:bg-primary-hover transition-all duration-200 shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="px-5 py-4 bg-primary-light rounded-xl border-2 border-primary/30 shadow-sm">
                      <p className="text-text-main font-semibold text-lg">{user?.name || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center text-base font-bold text-text-main mb-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 group-hover:bg-primary-hover transition-all duration-200 shadow-lg">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <div className="px-5 py-4 bg-primary-light rounded-xl border-2 border-primary/30 shadow-sm">
                      <p className="text-text-main font-semibold text-lg">{user?.email || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="group">
                  <label className="flex items-center text-base font-bold text-text-main mb-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 group-hover:bg-primary-hover transition-all duration-200 shadow-lg">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="px-5 py-4 bg-primary-light rounded-xl border-2 border-primary/30 shadow-sm">
                      <p className="text-text-main font-semibold text-lg">{user?.phoneNumber || 'Not provided'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Work Info */}
              <div className="space-y-6">
                {/* Department */}
                <div className="group">
                  <label className="flex items-center text-base font-bold text-text-main mb-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 group-hover:bg-primary-hover transition-all duration-200 shadow-lg">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((department) => (
                        <option key={department.value} value={department.value}>
                          {department.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-5 py-4 bg-primary-light rounded-xl border-2 border-primary/30 shadow-sm">
                      <p className="text-text-main font-semibold text-lg">{user?.department || 'Not assigned'}</p>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div className="group">
                  <label className="flex items-center text-base font-bold text-text-main mb-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 group-hover:bg-primary-hover transition-all duration-200 shadow-lg">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    Role
                  </label>
                  {isEditing && isAdmin(user) ? (
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-5 py-4 bg-primary-light rounded-xl border-2 border-primary/30 shadow-sm">
                      <p className="text-text-main font-semibold text-lg capitalize">{user?.role || 'Not assigned'}</p>
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
