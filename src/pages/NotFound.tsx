import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle';
import { Home } from 'lucide-react';

const NotFound = () => {
  useTitle('404 - KukeMC');
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-bold text-slate-200 dark:text-slate-800 select-none transition-colors duration-300">404</h1>
      <div className="absolute">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">页面未找到</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 transition-colors duration-300">这片区块似乎还没有生成...</p>
        <Link 
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors duration-300"
        >
          <Home size={20} />
          返回出生点
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
