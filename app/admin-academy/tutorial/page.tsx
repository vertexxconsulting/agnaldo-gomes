import { SystemTutorial } from '@/components/SystemTutorial';

export default function AdminAcademyTutorialPage() {
  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ajuda e Tutorial</h1>
        <p className="text-foreground/60 mt-1">
          Aprenda a navegar e tirar o máximo proveito do painel da Academy.
        </p>
      </div>
      
      <SystemTutorial module="admin-academy" />
    </div>
  );
}
