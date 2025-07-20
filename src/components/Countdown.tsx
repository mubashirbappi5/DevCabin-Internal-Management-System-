import { useEffect, useState } from 'react';

function Countdown({ dueDate }: { dueDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(dueDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Overdue');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

      setTimeLeft(parts.join(' ') + ' left');
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // update every 1 min
    return () => clearInterval(timer);
  }, [dueDate]);

  return <span className='text-red-400 font-semibold'>{timeLeft}</span>;
}
export default Countdown;