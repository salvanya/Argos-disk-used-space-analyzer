import { Header } from "../components/layout/Header";

export function Explorer() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <div className="glass p-10 text-center">
          <p className="text-sm text-white/40">Explorer — coming in M4</p>
        </div>
      </main>
    </div>
  );
}
