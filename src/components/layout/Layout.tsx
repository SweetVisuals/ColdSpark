import React from 'react';
import Navigation from '../Navigation';

interface LayoutProps {
    children: React.ReactNode;
    fullHeight?: boolean; // If true, main container is flex-col and overflow-hidden (for Inbox style apps)
}

const Layout: React.FC<LayoutProps> = ({ children, fullHeight = false }) => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen overflow-hidden">
                <Navigation />
                {fullHeight ? (
                    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                        {children}
                    </main>
                ) : (
                    <main className="flex-1 p-8 pt-6 overflow-y-auto bg-background">
                        {children}
                    </main>
                )}
            </div>
        </div>
    );
};

export default Layout;
