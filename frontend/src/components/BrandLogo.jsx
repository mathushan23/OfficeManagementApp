export default function BrandLogo({ dark = false, size = 'md', className = '' }) {
  const buildersColor = dark ? 'text-slate-600' : 'text-slate-300';
  const mainSize = size === 'sm' ? 'text-[1.7rem]' : 'text-[2.35rem]';
  const markSize = size === 'sm' ? 'text-[0.72rem]' : 'text-[0.98rem]';
  const dotSize = size === 'sm' ? 'text-[0.62rem]' : 'text-[0.82rem]';
  const slashMargin = size === 'sm' ? 'mr-1.5' : 'mr-2';

  return (
    <div className={`inline-flex items-end whitespace-nowrap leading-none ${className}`}>
      <span className={`${slashMargin} ${mainSize} font-black tracking-[-0.08em] text-[#fd7e14]`}>//</span>
      <span className={`${mainSize} font-black tracking-[-0.06em] text-[#fd7e14]`}>WEB</span>
      <span className={`${mainSize} font-black tracking-[-0.06em] ${buildersColor}`}>builders</span>
      <span className="ml-1 inline-flex -translate-y-[0.1rem] flex-col items-center leading-none">
        <span className={`inline-block -rotate-90 ${markSize} font-black tracking-[-0.08em] text-[#fd7e14]`}>
          LK
        </span>
        <span className={`-mt-[2px] ${dotSize} font-black ${buildersColor}`}>.</span>
      </span>
    </div>
  );
}
