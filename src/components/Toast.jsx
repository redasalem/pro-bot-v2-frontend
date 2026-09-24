import { BadgeCheck, CircleOff } from 'lucide-react';

const Toast = ({ isOpen, type = 'success', title, message, onClose, actionLabel = 'OK' }) => {
    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-300">
                <div className={`p-8 text-center ${isSuccess ? 'bg-cyan-50' : 'bg-red-50'}`}>
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-sm ${isSuccess ? 'bg-white text-cyan-600' : 'bg-white text-red-600'}`}>
                        {isSuccess ?
                            <BadgeCheck className="w-10 h-10"/> :
                            <CircleOff className="w-10 h-10" />
                        }
                    </div>
                    <h3 className={`text-xl font-extrabold mb-2 ${isSuccess ? 'text-cyan-900' : 'text-red-900'}`}>
                        {title}
                    </h3>
                    <p className="text-gray-600 text-sm font-semibold leading-relaxed m-0">
                        {message}
                    </p>
                </div>
                <div className="p-5 bg-white border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md hover-scale
                            ${isSuccess
                                ? 'bg-ink hover:bg-ink-soft'
                                : 'bg-red-600 hover:bg-red-700'
                            }
                        `}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toast;