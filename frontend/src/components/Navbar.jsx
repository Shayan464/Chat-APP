import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="bg-base-100/80 border-b border-base-300 fixed top-0 left-0 w-full z-40 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center justify-between h-full">
          {/* Left side — Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-base-content">Chatty</h1>
          </Link>

          {/* Right side — Auth actions */}
          {authUser ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm font-medium bg-base-200 hover:bg-base-300 text-base-content px-3 py-1.5 rounded-lg transition-colors"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 text-sm font-medium bg-base-200 hover:bg-base-300 text-base-content px-3 py-1.5 rounded-lg transition-colors"
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium bg-error/10 text-error hover:bg-error/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-base-content/80 hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link to="/signup" className="btn btn-sm btn-primary px-4">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
