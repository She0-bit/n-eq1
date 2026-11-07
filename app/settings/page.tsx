'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { 
  ShieldCheck, 
  HelpCircle, 
  Lock, 
  Eye, 
  Mail,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
  UserX
} from 'lucide-react'

export default function SettingsPage() {
  const [activeFaq, setActiveFaq] = useState<{ q: string; a: string } | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [showPoints, setShowPoints] = useState<boolean>(true)
  const [loadingToggle, setLoadingToggle] = useState<boolean>(false)
  
  const [activeModal, setActiveModal] = useState<'email' | 'password' | 'delete' | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [understandDelete, setUnderstandDelete] = useState<boolean>(false)

  const supabase = createClient()

  const isMinLength = newPassword.length >= 6
  const hasUpperCase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  const isPasswordValid = isMinLength && hasUpperCase && hasNumber && hasSpecialChar

  useEffect(() => {
    async function getSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('show_in_leaderboard')
          .eq('id', user.id)
          .maybeSingle()
          
        if (profile) {
          setShowPoints(profile.show_in_leaderboard !== false)
        }
      }
    }
    getSettings()
  }, [supabase])

  const closeModal = () => {
    setActiveModal(null)
    setNewEmail('')
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPassword('')
    setUnderstandDelete(false)
    setMessage(null)
  }

  async function verifyCurrentPassword(): Promise<boolean> {
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password.' })
      return false
    }
    const { error } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword })
    if (error) {
      setMessage({ type: 'error', text: 'Current password is incorrect.' })
      return false
    }
    return true
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (email === userEmail.toLowerCase()) {
      setMessage({ type: 'error', text: 'This is already your email address.' })
      return
    }

    try {
      setModalLoading(true)
      setMessage(null)
      if (!(await verifyCurrentPassword())) return
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      )

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Security links sent! Please check your inbox to confirm your new email address.' 
        })
        setNewEmail('')
        setCurrentPassword('')
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setModalLoading(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordValid) return
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    if (newPassword === currentPassword) {
      setMessage({ type: 'error', text: 'Your new password must be different from the current one.' })
      return
    }

    try {
      setModalLoading(true)
      setMessage(null)
      if (!(await verifyCurrentPassword())) return
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        await supabase.auth.signOut({ scope: 'others' })
        setMessage({ type: 'success', text: 'Password updated! You were signed out on other devices.' })
        setNewPassword('')
        setConfirmPassword('')
        setCurrentPassword('')
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setModalLoading(false)
    }
  }

  async function handleTogglePrivacy() {
    try {
      setLoadingToggle(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const nextState = !showPoints
      const { error } = await supabase
        .from('profiles')
        .update({ show_in_leaderboard: nextState })
        .eq('id', user.id)

      if (!error) {
        setShowPoints(nextState)
      }
    } catch {
    } finally {
      setLoadingToggle(false)
    }
  }

  const faqs = [
    { 
      q: "How do I earn points?", 
      a: "You can earn points in two ways: either by successfully completing surveys shared by other researchers within the community, or by sharing existing surveys with others to help expand their reach." 
    }
  ]

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8 bg-white text-slate-900 animate-fade-in">
      
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your credentials, privacy settings, and security.</p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
          <Lock size={12} /> Account & Security
        </h2>
        <div className="space-y-2">
          <SettingsActionCard 
            icon={<Mail className="text-charcoal" size={16} />} 
            title="Email Address" 
            description={userEmail ? `Registered as ${userEmail}` : "Update your registered email address"}
            onAction={() => setActiveModal('email')}
          />
          <SettingsActionCard 
            icon={<ShieldCheck className="text-charcoal" size={16} />} 
            title="Account Password" 
            description="Change your security password"
            onAction={() => setActiveModal('password')}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
          <Eye size={12} /> Privacy
        </h2>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">Show points in Leaderboard</p>
            <p className="text-xs text-slate-400 mt-0.5">Allow your rank and point score to be visible publicly.</p>
          </div>
          
          <button 
            disabled={loadingToggle}
            onClick={handleTogglePrivacy}
            className={`w-11 h-6 rounded-full relative transition-all duration-300 focus:outline-none flex items-center ${
              showPoints ? 'bg-emerald-500' : 'bg-slate-300'
            } ${loadingToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-all duration-300 flex items-center justify-center ${
              showPoints ? 'left-[21px]' : 'left-0.5'
            }`}>
              {loadingToggle && <Loader2 size={10} className="animate-spin text-emerald-600" />}
            </div>
          </button>
        </div>
      </section>

      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
          <HelpCircle size={12} /> Support & FAQ
        </h2>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {faqs.map((faq, i) => (
            <button 
              key={i}
              onClick={() => setActiveFaq(faq)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors group"
            >
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-950 transition-colors">{faq.q}</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-transform" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">
          <AlertCircle size={12} /> Account Actions
        </h2>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
              <UserX className="text-slate-500" size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Delete Account</p>
              <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and surveys.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveModal('delete')}
            className="text-xs font-bold text-slate-700 hover:text-white bg-white border border-slate-200 hover:bg-charcoal px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Delete
          </button>
        </div>
      </section>

      {activeFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFaq(null)} />
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 max-w-md w-full relative z-10 shadow-2xl animate-scale-up">
            <button onClick={() => setActiveFaq(null)} className="absolute right-5 top-5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2.5 mb-4 text-charcoal">
              <HelpCircle size={20} />
              <h3 className="font-bold text-slate-900 pr-6 text-base leading-snug">{activeFaq.q}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4">{activeFaq.a}</p>
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={closeModal} />
          
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 max-w-md w-full relative z-10 shadow-2xl animate-scale-up">
            <button onClick={closeModal} className="absolute right-5 top-5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>

            {activeModal !== 'delete' && (
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {activeModal === 'email' ? 'Update Email Address' : 'Change Password'}
              </h3>
            )}

            {message && (
              <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs mb-4 border ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                <p className="font-medium leading-relaxed">{message.text}</p>
              </div>
            )}

            {activeModal === 'email' && (
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">New Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter your new email"
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-charcoal font-medium"
                  />
                </div>
                <CurrentPasswordField value={currentPassword} onChange={setCurrentPassword} />
                <button 
                  type="submit" 
                  disabled={modalLoading || !currentPassword}
                  className="w-full font-bold text-sm bg-charcoal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-charcoal-deep text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </form>
            )}

            {activeModal === 'password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <CurrentPasswordField value={currentPassword} onChange={setCurrentPassword} />
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-charcoal font-medium"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password Requirements</p>
                  <ValidationItem isValid={isMinLength} label="At least 6 characters" />
                  <ValidationItem isValid={hasUpperCase} label="Contains an uppercase letter (A-Z)" />
                  <ValidationItem isValid={hasNumber} label="Contains at least one number (0-9)" />
                  <ValidationItem isValid={hasSpecialChar} label="Contains a special character (@, #, $, etc.)" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-charcoal font-medium"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={modalLoading || !isPasswordValid || !currentPassword || newPassword !== confirmPassword}
                  className={`w-full font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-white ${
                    isPasswordValid && currentPassword && newPassword === confirmPassword && !modalLoading
                      ? 'bg-charcoal hover:bg-charcoal-deep' 
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            )}

            {activeModal === 'delete' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <AlertCircle size={22} />
                  <h3 className="text-lg font-black tracking-tight">Delete Account?</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4">
                  This action is permanent. Your profile data, academic details, accumulated points, and all published surveys under <strong>n=1</strong> will be deleted from our records forever.
                </p>

                <CurrentPasswordField value={currentPassword} onChange={setCurrentPassword} />

                <label className="flex items-start gap-3 p-2 cursor-pointer select-none group">
                  <input 
                    type="checkbox"
                    checked={understandDelete}
                    onChange={(e) => setUnderstandDelete(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 transition-all accent-rose-600"
                  />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800 transition-colors leading-tight">
                    I understand that this action is irreversible and I want to proceed with deleting my account.
                  </span>
                </label>

               
                <button 
                  onClick={async () => {
                    if (!understandDelete) return
                    try {
                      setModalLoading(true)
                      setMessage(null)
                      if (!(await verifyCurrentPassword())) return
                      const { error } = await supabase.rpc('delete_user_account')
                      if (error) {
                        setMessage({ type: 'error', text: error.message })
                      } else {
                        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
                        window.location.href = '/auth'
                      }
                    } catch (err) {
                      setMessage({ type: 'error', text: 'Failed to delete account.' })
                    } finally {
                      setModalLoading(false)
                    }
                  }}
                  disabled={!understandDelete || !currentPassword || modalLoading}
                  className={`w-full font-bold text-sm py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm text-white ${
                    understandDelete && currentPassword && !modalLoading
                      ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : 'Permanently Delete My Account'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}

function ValidationItem({ isValid, label }: { isValid: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${isValid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${isValid ? 'bg-emerald-50 border-emerald-200' : 'border-slate-200'}`}>
        {isValid && <Check size={10} className="text-emerald-600" />}
      </div>
      <span>{label}</span>
    </div>
  )
}

function SettingsActionCard({ icon, title, description, onAction }: any) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:border-slate-200 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        onClick={onAction}
        className="text-xs font-bold text-charcoal hover:text-white bg-slate-100 hover:bg-charcoal px-4 py-2 rounded-xl border border-slate-200 hover:border-charcoal transition-all"
      >
        Manage
      </button>
    </div>
  )
}
function CurrentPasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Current Password</label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Confirm it's you"
        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-charcoal font-medium"
      />
    </div>
  )
}
