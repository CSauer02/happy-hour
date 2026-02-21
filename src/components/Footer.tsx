export default function Footer() {
  return (
    <footer className="shrink-0">
      <div className="rainbow-bar" />
      <div className="bg-brand-purple/95 px-4 py-1.5 text-center">
        <p className="text-white/60 text-xs">
          ATL Happy Hour &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
