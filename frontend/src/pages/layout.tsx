import React from 'react';
import Navbar from "../components/site/Navbar";
import Footer from '../components/site/Footer';
import { NavLink } from 'react-router';
import { navbarData } from '../lib/data';
import NotificationBell from '../components/ui/notificationbell';
import { LogoutBtn } from './auth/Logout';

const AppLayout = ({ children }: { children: React.ReactElement }) => {
  
  // Helper function to close the drawer
  const closeDrawer = () => {
    const drawerCheckbox = document.getElementById('my-drawer-3') as HTMLInputElement;
    if (drawerCheckbox) {
      drawerCheckbox.checked = false;
    }
  };

  return (
    <div className="drawer "> {/* Added lg:drawer-open back for your permanent desktop view */}
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col min-h-screen">
        <header className="sticky top-0 z-30">
          <Navbar />
        </header>

        <main className="flex-grow p-4 bg-gray-100/60">
        <NotificationBell />
          {children}
        </main>

        <Footer />
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>

        <ul className="menu bg-white border-r border-base-200 min-h-full w-80 p-4 pt-4 lg:pt-8">
          <li className="lg:hidden mb-4 border-b pb-2">
            <span className="text-2xl font-black font-serif">IFB Menu</span>
          </li>
          <li className="menu-title text-gray-400">Navigation</li>
          {
            navbarData.map((item, index) => (
              <li key={index}>
                <NavLink 
                  to={item.path} 
                  onClick={closeDrawer} // Closes the drawer when clicked
                  className={({ isActive }) => isActive ? "bg-slate-200 font-bold" : ""}
                >
                  {item.text.split(" ").map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(" ")}
                </NavLink>
              </li>
            ))
          }
          <div className="divider"></div>
          <li><LogoutBtn /></li>
        </ul>
      </div>
    </div>
  );
}

export default AppLayout;