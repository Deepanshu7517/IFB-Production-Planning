import { useState, useEffect } from 'react';
const Footer = () => {
  const [dateTime, setDateTime] = useState(new Date());
  useEffect(() => {
    // Set up timer to update state every 1 second (1000ms)
    const timerId = setInterval(() => {
      setDateTime(new Date())
    }, 1000);

    // Cleanup function: clear interval when component unmounts
    return () => clearInterval(timerId);
  }, []); // Empty dependency array ensures this runs only once on mount
  const formatDateTime = (date: any) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };
  return (
    <footer className="footer sm:footer-horizontal bg-neutral text-neutral-content items-center p-4 sticky bottom-0 z-50">
      <aside className="grid-flow-col items-center">
        <p>© Design and Developed by Iotelligence Software Solutions, Goa</p>
      </aside>
      <nav className="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
        <div>
          {formatDateTime(dateTime)}
        </div>
      </nav>
    </footer>
  );
}

export default Footer;