import React, { useState } from 'react';
import { useNavigate, Navigate } from "react-router-dom";
import { useMutation } from '@tanstack/react-query';
import Toast from '../components/Toast';
import { loginRequest } from './../api/auth';
import { setToken, isLoggedIn } from '../lib/auth';
import { LogIn } from 'lucide-react';

export default function Login() {
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />;
  }

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });
  
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  const { mutate: login, isPending } = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      const token = data.accessToken;
      if (token) setToken(token);
      setToast({
        isOpen: true,
        type: "success",
        title: "تم تسجيل الدخول بنجاح",
        message: "مرحباً بك، يمكنك الآن الدخول إلى لوحة التحكم.",
      });
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        "البريد الإلكتروني أو كلمة المرور غير صحيحة";

      setToast({
        isOpen: true,
        type: "error",
        title: "فشل تسجيل الدخول",
        message,
      });
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isEmailValid || !isPasswordValid) return;
    login({ email, password });
  };

  const handleToastClose = () => {
    const wasSuccess = toast.type === "success";
    setToast((t) => ({ ...t, isOpen: false }));
    if (wasSuccess) navigate("/dashboard");
  };

  return (
    <>
      <main className="min-h-screen bg-paper flex items-center justify-center p-6">
        <section className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid md:grid-cols-[1.2fr_0.8fr]">
          
          {/* Form Side */}
          <div className="p-8 md:p-14 flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-10">
              <span className="flex items-center justify-center w-12 h-12 bg-cyan/10 text-cyan-dark rounded-xl">
                <LogIn size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-ink mb-1">تسجيل الدخول</h1>
                <p className="text-sm text-gray-500">أدخل بياناتك للوصول إلى لوحة تحكم Khaleeji Bot</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <label className="flex flex-col gap-2 text-sm font-semibold text-ink-soft">
                البريد الإلكتروني
                <input 
                  name="email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={`min-h-[3rem] px-4 rounded-xl border bg-gray-50 focus:bg-white focus:ring-4 outline-none transition-all ${
                    emailTouched && !isEmailValid 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-cyan focus:ring-cyan/10'
                  }`}
                />
                {emailTouched && !isEmailValid && (
                  <span className="text-xs text-red-500">يرجى إدخال بريد إلكتروني صحيح</span>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-ink-soft">
                كلمة المرور
                <input 
                  name="password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e)=> setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className={`min-h-[3rem] px-4 rounded-xl border bg-gray-50 focus:bg-white focus:ring-4 outline-none transition-all ${
                    passwordTouched && !isPasswordValid 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-cyan focus:ring-cyan/10'
                  }`}
                />
                {passwordTouched && !isPasswordValid && (
                  <span className="text-xs text-red-500">كلمة المرور يجب أن تكون 6 أحرف على الأقل</span>
                )}
              </label>

              <button 
                type="submit" 
                disabled={isPending}
                className="mt-4 min-h-[3rem] px-6 rounded-xl bg-orange text-white font-bold hover-scale disabled:opacity-50 disabled:pointer-events-none"
              >
                {isPending ? "جاري الدخول..." : "دخول"}
              </button>
            </form>
          </div>

          {/* Graphic Side */}
          <div className="hidden md:flex bg-ink p-12 items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#102b3d,transparent_60%)]"></div>
            <img src="/logo.png" alt="Khaleeji Bot Logo" className="relative z-10 max-w-[200px] drop-shadow-2xl hover:scale-105 transition-transform duration-700" />
          </div>

        </section>
      </main>

      <Toast {...toast} onClose={handleToastClose} />
    </>
  )
}
