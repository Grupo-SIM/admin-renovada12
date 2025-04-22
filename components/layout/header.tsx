import React from "react";
import { Bell, Search, Menu, User, LogOut } from "lucide-react";
import { clearCookie } from "@/hooks/set-cookie";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await clearCookie();
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado com segurança.",
        variant: "default",
      });
      
      // Redireciona para a página de login
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Houve um problema ao tentar sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="h-16 bg-white shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6 text-gray-500" />
          </button>

        </div>

        <div className="flex items-center space-x-4">

          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <LogOut 
                onClick={handleLogout}
                style={{cursor:"pointer"}} 
                className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" 
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;