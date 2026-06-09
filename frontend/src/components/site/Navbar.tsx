import { useLocation, useNavigate } from "react-router-dom";
import imageLogo from '../../assets/logo.png'
import { navbarData } from "../../lib/data";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Calculate the title directly from the path (No useState needed)
  const activeNavItem = navbarData.find((item) => item.path === location.pathname);
  
  // 2. Fallback to a default title if no match is found
  const displayTitle = activeNavItem ? activeNavItem.text.toUpperCase() : "IFB APPLICATION";

  return (
    <div className="navbar bg-white shadow-sm px-4">
      <div className="navbar-start gap-2">
        <div className="flex-none" onClick={() => navigate("/production-planning")}>
          <a className="text-3xl font-extrabold font-serif cursor-pointer"><img className="h-5" src="IFBlogo.png" alt="IFBdsz" /></a>
        </div>
        
        {/* Drawer Toggle Button */}
        <label htmlFor="my-drawer-3" className="btn btn-square btn-ghost">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-6 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </label>
      </div>

      <div className="navbar-center">
        <span className="text-lg font-bold uppercase tracking-widest text-slate-600 hidden md:block">
          {displayTitle}
        </span>
      </div>

      <div className="navbar-end">
        <img className="h-12" src={imageLogo} alt="Iotelligence Logo" />
      </div>
    </div>
  );
}

export default Navbar;