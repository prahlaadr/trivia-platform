import "./oop.css";

export default function OutOfPocketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="oop-scope min-h-screen">{children}</div>;
}
