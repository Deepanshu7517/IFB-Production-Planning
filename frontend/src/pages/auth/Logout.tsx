import { useNavigate } from "react-router-dom";

export const LogoutBtn = () => {
  const navigate  = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('production_user');
    navigate("/")
  }
  return(
    <button onClick={handleLogout}>Logout</button>
  )
};