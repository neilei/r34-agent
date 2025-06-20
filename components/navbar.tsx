"use client";

import { Button } from "@/archive/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image
            src="/rule34-logo.svg"
            alt="Rule34 Logo"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
        <nav className="flex items-center space-x-4">
          <Button
            variant="link"
            asChild
            className={pathname === "/" ? "font-bold" : ""}
          >
            <Link href="/">Home</Link>
          </Button>
          {/* <Button
            variant="link"
            asChild
            className={pathname === "/docs" ? "font-bold" : ""}
          >
            <Link href="/docs">Docs</Link>
          </Button> */}
          <Button
            variant="link"
            asChild
            className={pathname === "/donate" ? "font-bold" : ""}
          >
            <Link href="/donate">Donate</Link>
          </Button>
        </nav>
      </div>
    </div>
  );
}
