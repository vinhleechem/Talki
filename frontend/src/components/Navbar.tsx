import { NavLink } from "react-router-dom";

const NAV_LINKS = [
  { path: "/roadmap", label: "Bản đồ" },
  { path: "/pho-ban", label: "Phó Bản" },
  { path: "/achievements", label: "Thành tựu" },
  { path: "/profile", label: "Hồ sơ" },
];

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-card neo-border-b z-50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo → Home (T + Talki) */}
          <NavLink to="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            <div className="bg-primary neo-border neo-shadow-sm w-10 h-10 flex items-center justify-center">
              <span className="text-xl font-black text-primary-foreground">T</span>
            </div>
            <span className="text-base font-black uppercase tracking-tight">Talki</span>
          </NavLink>

          {/* Nav links */}
          <div className="flex items-center gap-4 ml-auto text-sm font-black">
            {NAV_LINKS.map((item) => (
              <NavLink key={item.path} to={item.path}>
                {({ isActive }) => (
                  <span
                    className={`inline-flex items-center px-3 py-1.5 uppercase tracking-[0.18em] transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground neo-border neo-shadow-sm"
                        : "text-foreground hover:opacity-80"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
