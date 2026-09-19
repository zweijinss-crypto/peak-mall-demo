import type { FC } from 'react';

export interface AnnouncementBarProps {
  /** 左侧小标签 (例如 "公告" / "Notice") */
  tag?: string;
  /** 要滚动的整段文字 */
  text?: string;
  /** CSS 动画时长,秒 */
  duration?: number;
}

/**
 * AnnouncementBar - 顶部滚动公告条 (参考源站 .roll)
 */
const AnnouncementBar: FC<AnnouncementBarProps> = ({
  tag = '公告',
  text = '新用户首单立享 8 折优惠 · 全场满 $50 包邮',
  duration = 18,
}) => {
  return (
    <div className="bg-white border-b border-neutral-100 h-[44px] flex items-center overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 w-full flex items-center gap-3">
        <span className="bg-orange-100 text-orange-700 text-[11.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0">
          {tag}
        </span>
        <div className="flex-1 overflow-hidden whitespace-nowrap text-[13.5px] text-neutral-600 relative">
          <div
            className="inline-block animate-[marquee_linear_infinite]"
            style={{ animationDuration: `${duration}s` }}
          >
            {text}　·　{text}
          </div>
          <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBar;
