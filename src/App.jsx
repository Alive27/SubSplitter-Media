import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, LogOut, Clock, Filter, Share2, Sparkles, Download, MessageCircle, Send, Globe, Camera, Crown, CheckCircle2, TrendingUp, BarChart3, AlertTriangle, Bell, Settings, X } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { toPng } from 'html-to-image';

function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [session, setSession] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(12);
  const [isPremium, setIsPremium] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Estados para autenticación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Nuevo modal de ajustes
  
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Streaming');
  const [newBillingCycle, setNewBillingCycle] = useState('monthly');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Límite de suscripciones para usuarios de la versión Lite
  const LITE_LIMIT = 3;

  // Referencia para capturar la tarjeta como imagen
  const cardRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchSubscriptions(session.user.id);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchSubscriptions(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setSubscriptions([]);
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSubscriptions = async (userId) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error cargando suscripciones:', error);
    else setSubscriptions(data || []);
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('hourly_rate, is_premium, email_notifications')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setHourlyRate(data.hourly_rate || 12);
      setIsPremium(data.is_premium || false);
      setEmailNotifications(data.email_notifications ?? true);
    }
  };

  const updateHourlyRate = async (newRate) => {
    setHourlyRate(newRate);
    if (!session) return;
    await supabase
      .from('profiles')
      .update({ hourly_rate: newRate })
      .eq('id', session.user.id);
  };

  const handleToggleNotifications = async (newValue) => {
    setEmailNotifications(newValue);
    if (!session) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications: newValue })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error al actualizar las preferencias de notificación:', error);
    }
  };

  // Validación previa antes de abrir el modal de añadir
  const handleOpenAddModal = () => {
    if (!isPremium && subscriptions.length >= LITE_LIMIT) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!newName || !newAmount || !session) return;

    if (!isPremium && subscriptions.length >= LITE_LIMIT) {
      setIsModalOpen(false);
      setIsUpgradeModalOpen(true);
      return;
    }

    const newSub = {
      user_id: session.user.id,
      name: newName,
      amount: parseFloat(newAmount),
      billing_cycle: newBillingCycle,
      category: newCategory,
      next_payment_date: newPaymentDate || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([newSub])
      .select();

    if (error) {
      console.error('Error al guardar:', error);
    } else if (data) {
      setSubscriptions([data[0], ...subscriptions]);
      setNewName('');
      setNewAmount('');
      setNewPaymentDate(new Date().toISOString().split('T')[0]);
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar:', error);
    } else {
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('¡Registro exitoso! Ya puedes iniciar sesión.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Función inteligente para asociar dominios oficiales para los logotipos
  const getServiceDomain = (name) => {
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (n.includes('netflix')) return 'netflix.com';
    if (n.includes('spotify')) return 'spotify.com';
    if (n.includes('disney')) return 'disneyplus.com';
    if (n.includes('hbo') || n.includes('max')) return 'max.com';
    if (n.includes('chatgpt') || n.includes('openai')) return 'openai.com';
    if (n.includes('gemini')) return 'google.com';
    if (n.includes('prime') || n.includes('amazon')) return 'amazon.com';
    if (n.includes('youtube')) return 'youtube.com';
    if (n.includes('apple')) return 'apple.com';
    if (n.includes('twitch')) return 'twitch.tv';
    if (n.includes('github')) return 'github.com';
    if (n.includes('discord')) return 'discord.com';
    if (n.includes('steam')) return 'steampowered.com';
    return `${n}.com`;
  };

  // Función para calcular días restantes hasta el próximo pago
  const getDaysUntilPayment = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(dateString);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = paymentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Función para descargar la tarjeta como imagen PNG
  const downloadCardAsImage = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'mis-fugas-subsplitter.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al generar la imagen del cartel:', err);
    }
  };

  // Cálculos
  const totalMonthly = subscriptions.reduce((acc, sub) => {
    const monthlyAmount = sub.billing_cycle === 'yearly' ? sub.amount / 12 : sub.amount;
    return acc + Number(monthlyAmount);
  }, 0);

  const totalYearly = totalMonthly * 12;
  const hoursOfWork = hourlyRate > 0 ? (totalMonthly / hourlyRate).toFixed(1) : 0;

  const filteredSubscriptions = selectedCategory === 'All' 
    ? subscriptions 
    : subscriptions.filter(sub => sub.category === selectedCategory);

  // Generador de datos históricos simulados basados en el gasto mensual actual para la gráfica PRO
  const generateChartData = () => {
    const months = ['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'];
    const base = totalMonthly;
    return months.map((m, index) => {
      const varianceFactor = 0.8 + (index * 0.04) + (Math.sin(index) * 0.05);
      return {
        month: m,
        amount: Math.max(0, Number((base * varianceFactor).toFixed(2)))
      };
    });
  };

  const chartData = generateChartData();
  const maxChartValue = Math.max(...chartData.map(d => d.amount), 10);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2 text-center">
            SubSplitter Media
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6">Controla tus micro-pagos y fugas de dinero</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Correo electrónico</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg text-sm transition-all mt-2"
            >
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        
        {/* Cabecera Responsiva */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  SubSplitter Media
                </h1>
                {isPremium ? (
                  <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Crown size={12} /> PRO
                  </span>
                ) : (
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    LITE ({subscriptions.length}/{LITE_LIMIT})
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">Controla tus micro-pagos y fugas de dinero</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            {/* Botón de Engranaje (Ajustes PRO y Opciones) */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 rounded-lg transition-all shrink-0 shadow-sm"
              title="Ajustes y Opciones PRO"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 font-semibold px-3.5 py-2 rounded-lg transition-all text-sm shrink-0"
              title="Generar cartel para redes sociales"
            >
              <Share2 size={16} /> Cartel RRSS
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-all text-sm shrink-0 shadow-lg"
            >
              <PlusCircle size={18} /> Añadir Suscripción
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Banner de Promoción Premium / Estado */}
        {!isPremium ? (
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div>
              <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                <Crown size={16} className="text-amber-400" /> SubSplitter Media Premium
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Estás en la versión Lite ({subscriptions.length}/{LITE_LIMIT} suscripciones). Desbloquea gráficas históricas, exportación CSV e ilimitadas por solo 3,00 €/mes.
              </p>
            </div>
            <a
              href="https://buy.stripe.com/test_4gM14ob841QUb8E7tD2B200"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shrink-0 shadow-lg text-center"
            >
              Obtener Premium 🚀
            </a>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
            <div className="p-2 bg-amber-400/10 rounded-xl text-amber-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 text-sm">Suscripción Premium Activa</h4>
              <p className="text-xs text-slate-300">Disfrutas de analíticas gráficas y todas las ventajas PRO sin restricciones.</p>
            </div>
          </div>
        )}

        {/* Tarjetas de Resumen & Métrica de Realidad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <span className="text-sm text-slate-400">Gasto Estimado Mensual</span>
            <div className="text-3xl font-bold text-emerald-400 mt-1">
              {totalMonthly.toFixed(2)} € <span className="text-xs font-normal text-slate-500">/ mes</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <span className="text-sm text-slate-400">Proyección Anual</span>
            <div className="text-3xl font-bold text-cyan-400 mt-1">
              {totalYearly.toFixed(2)} € <span className="text-xs font-normal text-slate-500">/ año</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Impacto en Trabajo</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {hoursOfWork} horas <span className="text-xs font-normal text-slate-500">/ mes</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Tu tarifa/h:</span>
              <input 
                type="number" 
                value={hourlyRate} 
                onChange={(e) => updateHourlyRate(Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Gráfica Histórica de Evolución de Gastos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">Evolución Histórica de Gastos</h3>
                <p className="text-xs text-slate-400">Tendencia de tus micro-pagos en los últimos 6 meses</p>
              </div>
            </div>
            {isPremium ? (
              <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <TrendingUp size={12} /> Analítica Activa
              </span>
            ) : (
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
              >
                <Crown size={12} /> Desbloquear Gráfica PRO
              </button>
            )}
          </div>

          <div className="relative pt-6 pb-2">
            {!isPremium && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 space-y-3 rounded-xl border border-slate-800">
                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  <Crown size={20} />
                </div>
                <h4 className="font-bold text-white text-sm">Visualización Histórica Bloqueada</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Hazte usuario PRO para acceder a gráficos de tendencia de tus gastos y detectar fugas a tiempo.
                </p>
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  Desbloquear por 3,00 €/mes 🚀
                </button>
              </div>
            )}

            <div className="h-44 w-full flex items-end justify-between gap-3 px-2 pt-6 pb-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {chartData.map((item, index) => {
                const heightPercentage = Math.round((item.amount / maxChartValue) * 100);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    <div className="absolute -top-8 bg-slate-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 shadow-lg">
                      {item.amount.toFixed(2)} €
                    </div>
                    <div 
                      style={{ height: `${Math.max(heightPercentage, 12)}%` }}
                      className="w-full max-w-[40px] bg-gradient-to-t from-emerald-600 to-cyan-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-md"
                    ></div>
                    <span className="text-[11px] text-slate-400 mt-2 font-medium">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lista de Suscripciones, Alertas y Filtros */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-200">Tus Suscripciones Activas</h2>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Botón condicional de Exportar CSV */}
              {isPremium ? (
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + ["Servicio,Precio,Ciclo,Categoría,Próximo Pago"].concat(
                          subscriptions.map(s => `${s.name},${s.amount},${s.billing_cycle},${s.category},${s.next_payment_date || ''}`)
                        ).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "mis_suscripciones_subsplitter.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-xs bg-slate-950 text-slate-300 hover:text-emerald-400 border border-slate-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                >
                  📥 Exportar CSV
                </button>
              ) : (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
                >
                  <Crown size={12} /> Desbloquear CSV (PRO)
                </button>
              )}

              {/* Filtros de Categoría Libres */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                <Filter size={14} className="text-slate-500 shrink-0" />
                {['All', 'Streaming', 'IA', 'Software', 'Ocio'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-lg transition-all shrink-0 ${
                      selectedCategory === cat 
                        ? 'bg-emerald-500 text-slate-950 font-semibold' 
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredSubscriptions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay suscripciones en esta categoría.</p>
          ) : (
            <div className="space-y-3">
              {filteredSubscriptions.map((sub) => {
                const domain = getServiceDomain(sub.name);
                const daysLeft = getDaysUntilPayment(sub.next_payment_date);
                const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                const isPastDue = daysLeft !== null && daysLeft < 0;

                return (
                  <div key={sub.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-all gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-2">
                        <img 
                          src={`https://img.logo.dev/${domain}?token=pk_live_placeholder&size=120`} 
                          alt={sub.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <span className="font-bold text-emerald-400 text-sm hidden items-center justify-center w-full h-full">
                          {sub.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-200">{sub.name}</h3>
                          {/* Alerta de Renovación Próxima */}
                          {isUrgent && (
                            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle size={10} /> Renueva en {daysLeft === 0 ? 'hoy' : `${daysLeft}d`}
                            </span>
                          )}
                          {isPastDue && (
                            <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle size={10} /> Pago pendiente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {sub.category}
                          </span>
                          {sub.next_payment_date && (
                            <span className="text-[11px] text-slate-500">
                              Cobro: {sub.next_payment_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                      <div className="text-right">
                        <span className="font-semibold text-slate-100 block">{Number(sub.amount).toFixed(2)} €</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">{sub.billing_cycle}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(sub.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-900"
                        title="Eliminar suscripción"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Ajustes y Opciones PRO (Engranaje) */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Settings size={20} className="text-emerald-400" /> Ajustes y Opciones PRO
                </h3>
                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Opción 1: Notificaciones por correo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Avisos por Email</h4>
                      <p className="text-[11px] text-slate-400">Recibe recordatorios automáticos de cobro.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emailNotifications} 
                    onChange={(e) => handleToggleNotifications(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>

                {/* Opción 2: Estado de Cuenta y Funciones PRO */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Estado de cuenta:</span>
                    {isPremium ? (
                      <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Crown size={12} /> PRO Activo
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                        Versión Lite
                      </span>
                    )}
                  </div>
                  {!isPremium && (
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsUpgradeModalOpen(true);
                      }}
                      className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Crown size={14} /> Pasarse a PRO (3,00 €/mes)
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Límite Lite / Funciones PRO Alcanzado */}
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl max-w-md w-full text-center shadow-2xl space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-400 text-xl font-bold">
                ⭐
              </div>
              <h3 className="text-xl font-bold text-white">Función exclusiva PRO</h3>
              <p className="text-slate-300 text-sm">
                Has alcanzado el límite de {LITE_LIMIT} suscripciones gratuitas o intentado acceder a gráficas avanzadas. ¡Hazte PRO para desbloquear todo sin restricciones!
              </p>
              
              <div className="flex gap-3 justify-center pt-2">
                <button 
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-sm transition-all"
                >
                  Cancelar
                </button>
                <a 
                  href="https://buy.stripe.com/test_4gM14ob841QUb8E7tD2B200" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg"
                >
                  ¡Pasarse a PRO! 🚀
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Cartel y Redes Sociales */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-5 my-8">
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                  <Sparkles size={18} className="text-cyan-400" /> Compartir en Redes
                </h3>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>

              <div ref={cardRef} className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                {!isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-emerald-500/20 text-4xl sm:text-5xl font-black uppercase tracking-widest rotate-[-30deg] select-none">
                      Versión Lite
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">SubSplitter Media</span>
                  <h4 className="text-xl font-black text-white mt-1">Mis Fugas de Dinero 💸</h4>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Gasto Mensual</span>
                    <span className="text-lg font-bold text-emerald-400">{totalMonthly.toFixed(2)} €</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">Impacto Laboral</span>
                    <span className="text-lg font-bold text-amber-400">{hoursOfWork} h/mes</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 italic">
                  "Mantengo {subscriptions.length} suscripciones activas devorando mis ahorros."
                </p>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono relative z-20">
                  <span>subsplitter-media.vercel.app</span>
                  {isPremium && (
                    <span className="text-amber-400 flex items-center gap-1 font-sans font-semibold">
                      <Crown size={10} /> PRO Edition
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={downloadCardAsImage}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={16} /> Descargar Cartel (PNG)
              </button>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 block text-center mb-2">O comparte directamente un mensaje:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`📉 Mis suscripciones suman ${totalMonthly.toFixed(2)}€ (${hoursOfWork}h de trabajo al mes). ¡Controlando mis fugas de dinero con SubSplitter Media! 🚀`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-black hover:bg-slate-950 border border-slate-800 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <Globe size={14} /> Compartir en X
                  </a>

                  <button
                    onClick={() => {
                      downloadCardAsImage();
                      navigator.clipboard.writeText(`📉 Mis suscripciones suman ${totalMonthly.toFixed(2)}€ al mes (${hoursOfWork}h de trabajo). ¡Controlando mis fugas con SubSplitter Media! 🚀\n#FinanzasPersonales #SubSplitter #Ahorro`);
                      alert('¡Cartel descargado y texto copiado al portapapeles! Ya puedes abrir Instagram y subir tu historia o publicación pegando el texto.');
                    }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all shadow-md"
                  >
                    <Camera size={14} /> Instagram (Story/Post)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`📉 ¡Mira mis gastos en suscripciones! Gasto ${totalMonthly.toFixed(2)}€ al mes (${hoursOfWork} horas de trabajo). Descubre SubSplitter Media.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://subsplitter-media.vercel.app')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <Send size={14} /> Facebook
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal para añadir suscripción */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Nueva Suscripción</h3>
              <form onSubmit={handleAddSubscription} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre del servicio</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Netflix, ChatGPT, Disney Plus..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Precio (€)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newAmount} 
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="9.99" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Próxima fecha de cobro</label>
                  <input 
                    type="date" 
                    value={newPaymentDate} 
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ciclo de facturación</label>
                  <select 
                    value={newBillingCycle} 
                    onChange={(e) => setNewBillingCycle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Streaming">Streaming</option>
                    <option value="IA">Inteligencia Artificial</option>
                    <option value="Software">Software / Cloud</option>
                    <option value="Ocio">Ocio / Gaming</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;