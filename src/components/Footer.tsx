import { Github, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12 relative overflow-hidden transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src="https://m.ccw.site/gandi_application/user_assets/2a6bb37880317d2bb5525ab560618e04.png" 
                alt="KukeMC Logo" 
                className="h-10 w-10 transition-transform hover:scale-110"
              />
              <div>
                <span className="text-xl font-bold text-slate-900 dark:text-white block">KukeMC</span>
                <span className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Minecraft Server</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              一个温馨和谐的多玩法群组服务器，致力于提供稳定流畅的游戏体验。在这里，你可以找到属于自己的快乐。
            </p>
            <div className="flex items-center gap-4">
              <a href="https://qm.qq.com/q/GLZnakrlaq" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-[#0099FF] hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-full transition-all" aria-label="QQ Group">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"/>
                </svg>
              </a>
              <a href="https://space.bilibili.com/3546652948302452" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-[#FB7299] hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-full transition-all" aria-label="Bilibili">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"/>
                </svg>
              </a>
              <a href="https://github.com/kukemc/KukeMC-WebSite" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-full transition-all" aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href="mailto:admin@kuke.ink" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-full transition-all" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="text-slate-900 dark:text-white font-medium mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
              关注我们
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="https://klpbbs.com/thread-151387-1-1.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  苦力怕论坛宣传贴
                </a>
              </li>
              <li>
                <a href="https://space.bilibili.com/3546652948302452/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  B站官方账号
                </a>
              </li>
              <li>
                <a href="https://www.mclists.cn/server/7682.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  MClists服务器列表
                </a>
              </li>
              <li>
                <a href="https://www.minebbs.com/threads/1-6-1-21-kukemc.29497/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  Minebbs宣传贴
                </a>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-slate-900 dark:text-white font-medium mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
              实用工具
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="https://www.yuque.com/0ctber/kukemc-server/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  KukeWiki 官方百科
                </a>
              </li>
              <li><Link to="/bans" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">服务器封禁玩家列表</Link></li>
              <li><Link to="/players" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">服务器在线玩家</Link></li>
              <li><Link to="/messages" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">服务器玩家留言板</Link></li>
            </ul>
          </div>

          {/* Friendly Links */}
          <div>
            <h3 className="text-slate-900 dark:text-white font-medium mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
              友情链接
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="https://sipc.ink/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  SIPC的个人主页
                </a>
              </li>
              <li>
                <a href="https://lyrify.cloud/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  lyrify
                </a>
              </li>
              <li>
                <a href="https://ccw.site" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  共创世界
                </a>
              </li>
              <li>
                <a href="https://ccwl.appinnov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-2">
                  CCW launcher
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 dark:text-slate-500">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p>&copy; {currentYear} KukeMC Server. All rights reserved.</p>
            <span className="hidden md:block text-slate-300 dark:text-slate-800">|</span>
            <a href="https://icp.gov.moe/?keyword=20241120" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-slate-400 transition-colors cursor-pointer">萌ICP备20241120号</a>
          </div>
          <p className="flex items-center gap-1">
            Made with <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" /> by KukeMC Team
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
