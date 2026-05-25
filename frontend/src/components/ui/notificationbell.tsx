// import  { useState } from 'react';

const NotificationBell = () => {
  // Notification State
  // const [unreadCount, setUnreadCount] = useState(5);

  return (
    /* The dropdown container handles the alignment in the filter bar */
    <div className="dropdown dropdown-hover dropdown-left self-center absolute top-18 right-6 lg:right-12">
      
      {/* TRIGGER: The Bell Icon itself acts as the button */}
      <div 
        tabIndex={0} 
        role="button" 
        className="btn btn-ghost btn-circle"
      >
        <div className="indicator">
          {/* 1. The Bell Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {/* 2. The Red Notification Badge */}
          {/* {unreadCount > 0 && (
            <span className="indicator-item badge badge-error badge-xs text-white font-bold px-1.5 py-2">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )} */}
          {5 > 0 && (
            <span className="indicator-item badge badge-error badge-xs text-white font-bold px-1.5 py-2">
              {5 > 9 ? '9+' : 5}
            </span>
          )}
        </div>
      </div>

      {/* DROPDOWN CONTENT */}
      <ul 
        tabIndex={-1} 
        className="dropdown-content menu bg-base-100 rounded-box z-50 w-64 p-2 shadow-xl border border-gray-200"
      >
        <li className="menu-title text-gray-500 font-bold uppercase text-xs">Notifications</li>
        <div className="divider my-0"></div>
        <li><a className="text-sm">Machine #04: Maintenance Due</a></li>
        <li><a className="text-sm">Plan Attainment reached 95%</a></li>
        <li><a className="text-sm">New Production Schedule uploaded</a></li>
        <div className="divider my-0"></div>
        <li><a className="text-xs text-center text-blue-600 font-bold">View All</a></li>
      </ul>
    </div>
  );
};

export default NotificationBell;