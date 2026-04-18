import React from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Outlet } from 'react-router-dom';

const CustomerLayout = () => {
    return (
        <div className="flex flex-col min-h-screen rf-page">
            <Header />
            <main className="flex-grow relative">
                <div className="animate-fade-in">
                    <Outlet />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CustomerLayout;
