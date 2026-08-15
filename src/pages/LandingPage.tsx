import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Lock,
  Phone,
  Fingerprint,
  FileBadge,
  Car,
  ChevronDown,
  Sparkles,
  UserCheck,
  Star,
  Building2,
  CreditCard,
  Vote,
  MessageCircle,
  Menu,
  X,
  Search,
  Link as LinkIcon,
  HelpCircle,
  Smartphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext.tsx";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  React.useEffect(() => {
    const hasCodeInUrl = window.location.search.includes("code=");
    if (hasCodeInUrl || (!loading && user)) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLoginClick = () => {
    navigate("/login");
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const capabilities = [
    {
      title: "Number Information",
      desc: "Get complete ownership details, name, and address linked to any mobile number instantly.",
      icon: <Smartphone className="w-6 h-6 text-cyan-600" />,
      bg: "bg-cyan-50",
      badge: "TRENDING",
      badgeBg: "bg-sky-100 text-sky-800 border-sky-200"
    },
    {
      title: "Aadhaar Info API",
      desc: "Verify demographic details, mobile link status, and complete user Aadhaar data securely.",
      icon: <Fingerprint className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50"
    },
    {
      title: "Aadhaar Advanced",
      desc: "Advanced search for Aadhaar details by Name, Mobile, Father's Name, or Address.",
      icon: <UserCheck className="w-6 h-6 text-teal-600" />,
      bg: "bg-teal-50"
    },
    {
      title: "Aadhar to PAN",
      desc: "Easily fetch linked PAN card number and full details using the Aadhaar number securely.",
      icon: <LinkIcon className="w-6 h-6 text-purple-600" />,
      bg: "bg-purple-50"
    },
    {
      title: "PAN Card Find & DOB",
      desc: "Instant cardholder full name lookup, DOB verification, and active NSDL status.",
      icon: <FileBadge className="w-6 h-6 text-rose-600" />,
      bg: "bg-rose-50",
      badge: "HOT",
      badgeBg: "bg-rose-100 text-rose-800 border-rose-200"
    },
    {
      title: "Vahan RC & Vehicle",
      desc: "Fetch complete RC owner name, chassis number, vehicle class, and insurance validity.",
      icon: <Car className="w-6 h-6 text-indigo-600" />,
      bg: "bg-indigo-50"
    },
    {
      title: "Bank Account & UPI",
      desc: "Instant penny drop bank validation, account holder name match, and UPI VPA verification.",
      icon: <CreditCard className="w-6 h-6 text-amber-600" />,
      bg: "bg-amber-50"
    },
    {
      title: "Voter ID Search",
      desc: "Query EPIC voter record details, assembly constituency, and relative details instantly.",
      icon: <Vote className="w-6 h-6 text-emerald-600" />,
      bg: "bg-emerald-50"
    }
  ];

  const testimonials = [
    {
      quote:
        "Pehle main alag-alag API use karta tha, par TraceXData me Number Info, PAN Find, aur Bank Account opening sab ek jagah mil gaya. Accuracy 100% hai.",
      name: "Ramesh Kumar",
      role: "CYBER CAFE OWNER",
      avatarBg: "bg-blue-100 text-blue-700",
      letter: "R"
    },
    {
      quote:
        "Inka auto-refund system aur UPI API bahut badhiya hai. API down ho tabhi mere wallet se paise nahi kat te. Highly recommended platform for all CSCs.",
      name: "Sunita Devi",
      role: "CSC CENTER OPERATOR",
      avatarBg: "bg-purple-100 text-purple-700",
      letter: "S"
    },
    {
      quote:
        "E-Challan aur Vahan RC verification instantly fetch hota hai. Customer wait nahi karna padta. Commission and settlement is also very fast compared to others.",
      name: "Manish Singh",
      role: "INSURANCE AGENT",
      avatarBg: "bg-emerald-100 text-emerald-700",
      letter: "M"
    }
  ];

  const faqs = [
    {
      q: "What is TraceXData Platform?",
      a: "TraceXData is India's leading B2B verification & API platform. We empower retailers, cyber cafes, and developers with sub-second APIs for Aadhaar, PAN, Vehicle RC, and telecom subscriber data."
    },
    {
      q: "How do I access the Retailer Portal Services?",
      a: "Simply click on 'Member Login' or 'Partner With Us' to authenticate with your Google Account. Once logged in, your wallet balance and API access will be ready immediately."
    },
    {
      q: "What happens if an API call fails?",
      a: "TraceXData features an automated instant-refund mechanism. If an upstream provider fails to return data, your wallet balance is immediately refunded."
    },
    {
      q: "Is there automatic wallet recharge available?",
      a: "Yes! Our platform integrates instant Cashfree UPI gateway supporting 24/7 automated wallet recharges with zero delay."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT TICKER - Continuous Infinite Marquee Loop */}
      <div className="bg-[#0f172a] text-slate-300 text-[11px] font-medium py-2 border-b border-slate-800 overflow-hidden whitespace-nowrap select-none">
        <div className="animate-marquee flex items-center gap-10">
          {/* Ticker Set 1 */}
          <div className="flex items-center gap-8 shrink-0">
            <span className="flex items-center gap-1.5 font-bold text-sky-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-sky-400" />
              API PLATFORM
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% SECURE & ENCRYPTED
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              99.9% SERVER UPTIME
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              24/7 PRIORITY SUPPORT
            </span>
            <span className="font-extrabold text-blue-400 flex items-center gap-1 uppercase tracking-wider">
              ⚡ INDIA'S #1 API PLATFORM
            </span>
            <span className="text-slate-600">|</span>
          </div>

          {/* Ticker Set 2 (Duplicated for seamless 100% loop) */}
          <div className="flex items-center gap-8 shrink-0">
            <span className="flex items-center gap-1.5 font-bold text-sky-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-sky-400" />
              API PLATFORM
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% SECURE & ENCRYPTED
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              99.9% SERVER UPTIME
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              24/7 PRIORITY SUPPORT
            </span>
            <span className="font-extrabold text-blue-400 flex items-center gap-1 uppercase tracking-wider">
              ⚡ INDIA'S #1 API PLATFORM
            </span>
            <span className="text-slate-600">|</span>
          </div>

          {/* Ticker Set 3 (Extra buffer) */}
          <div className="flex items-center gap-8 shrink-0">
            <span className="flex items-center gap-1.5 font-bold text-sky-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-sky-400" />
              API PLATFORM
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% SECURE & ENCRYPTED
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              99.9% SERVER UPTIME
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              24/7 PRIORITY SUPPORT
            </span>
            <span className="font-extrabold text-blue-400 flex items-center gap-1 uppercase tracking-wider">
              ⚡ INDIA'S #1 API PLATFORM
            </span>
            <span className="text-slate-600">|</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            <span className="font-black text-2xl sm:text-3xl tracking-tight text-slate-900">
              TRACEX<span className="text-blue-600">DATA</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-slate-600 text-sm">
            <button
              onClick={() => scrollToSection("services")}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("reviews")}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Reviews
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Right Section CTAs */}
          <div className="hidden sm:flex items-center gap-5">
            <button
              onClick={handleLoginClick}
              className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Member Login
            </button>
            <button
              onClick={handleLoginClick}
              className="bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Partner With Us</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Overlay & Dropdown Menu */}
        {mobileMenuOpen && (
          <>
            {/* 50% Semi-Transparent Overlay Backdrop */}
            <div
              className="fixed inset-0 top-[100px] bg-slate-900/50 backdrop-blur-xs z-30 sm:hidden animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Floating Mobile Nav Panel with 100% Solid Buttons */}
            <div className="sm:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-2xl z-40 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <button
                  onClick={() => scrollToSection("services")}
                  className="block w-full text-left py-3 px-3 font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection("reviews")}
                  className="block w-full text-left py-3 px-3 font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Reviews
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="block w-full text-left py-3 px-3 font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex flex-col gap-2.5">
                <button
                  onClick={handleLoginClick}
                  className="w-full py-3 text-center font-extrabold text-slate-900 bg-white border-2 border-slate-300 hover:border-blue-600 rounded-xl text-sm shadow-xs transition-all active:scale-95 cursor-pointer opacity-100"
                >
                  Member Login
                </button>
                <button
                  onClick={handleLoginClick}
                  className="w-full py-3 text-center font-extrabold bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer opacity-100"
                >
                  <span>Partner With Us</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-8 max-w-7xl mx-auto text-center space-y-6">
        
        {/* Subtle Pill Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>TRUSTED B2B API PORTAL</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight max-w-5xl mx-auto">
          Verify Faster With <br />
          <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Smart API Services
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
          Number Info, Aadhar to PAN, PAN Find, Vahan, UPI, aur Bank Open jaisi premium APIs access karein. <span className="font-extrabold text-slate-900">No Setup Fee. Instant Activation.</span>
        </p>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={handleLoginClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-full text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleLoginClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-extrabold rounded-full text-sm sm:text-base border border-slate-300 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Login to Portal</span>
          </button>
        </div>
      </section>

      {/* 4. CAPABILITIES SECTION (Exact match from screenshot 2) */}
      <section id="services" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-block px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-black uppercase tracking-wider">
            OUR CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Explore 40+ Premium Services
          </h2>
          <p className="text-slate-500 text-xs sm:text-base max-w-2xl mx-auto font-medium">
            Identity verification, number info, banking, billing, and API integrations built for scale.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
            >
              {/* Top Row Icon + Badge */}
              <div className="flex items-center justify-between">
                <div className={`p-3.5 ${item.bg} rounded-2xl w-fit`}>
                  {item.icon}
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${item.badgeBg}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2 pt-1">
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. TESTIMONIALS SECTION (Exact match from screenshot 1) */}
      <section id="reviews" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-12 relative">
        
        {/* Background Graphic Accent */}
        <div className="absolute top-0 left-0 text-slate-100 font-serif text-[180px] font-black pointer-events-none select-none opacity-40 -z-10 leading-none">
          “
        </div>

        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-block px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-black uppercase tracking-wider">
            TESTIMONIALS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Trusted by 10,000+ Partners
          </h2>
          <p className="text-slate-500 text-xs sm:text-base max-w-2xl mx-auto font-medium">
            Dekhiye humare retailers ka kya kehna hai TraceXData ki services ke baare mein.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed font-medium">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${t.avatarBg}`}>
                  {t.letter}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ & CONTACT SECTION */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-8 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">Everything you need to know about TraceXData API integration</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
              </button>
              {openFaq === idx && (
                <div className="p-5 pt-0 text-xs text-slate-600 border-t border-slate-100 leading-relaxed font-medium">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[#0f172a] text-slate-400 py-12 px-4 sm:px-8 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-black text-white text-lg tracking-tight">
              TRACEX<span className="text-blue-400">DATA</span>
            </span>
            <div className="text-[11px] text-slate-500 mt-1">© 2026 TraceXData API Platform. All rights reserved.</div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-bold text-slate-300">
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/contactus" className="hover:text-white transition-colors">Contact Support</a>
            <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
            <button onClick={handleLoginClick} className="text-blue-400 hover:text-blue-300 font-extrabold cursor-pointer">
              Portal Member Login →
            </button>
          </div>
        </div>
      </footer>

      {/* 8. FLOATING WHATSAPP SUPPORT BUTTON (Exact match from screenshot) */}
      <a
        href="https://wa.me/919999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        title="Contact WhatsApp Support"
      >
        <MessageCircle className="w-7 h-7 fill-white text-emerald-500" />
      </a>

    </div>
  );
}
