import Icon, { type IconName } from "@/components/icons";

export default function ComingSoon({
  title,
  icon,
  blurb,
}: {
  title: string;
  icon: IconName;
  blurb: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-ember-wash text-ember">
        <Icon name={icon} size={26} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-normal tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{blurb}</p>
      <span className="mt-5 rounded-full border border-line bg-paper-bright px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        Coming soon
      </span>
    </div>
  );
}
