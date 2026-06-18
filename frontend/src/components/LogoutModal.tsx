import { LogOut, X } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel:  () => void;
}

export default function LogoutModal({ onConfirm, onCancel }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm animate-scale-in border border-gray-100 dark:border-gray-700">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut size={17} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-base">Sign out</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Are you sure you want to sign out? You'll need to log back in to access your account.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-5">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}