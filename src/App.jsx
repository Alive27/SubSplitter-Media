import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, LogOut, Clock, Filter, Share2, Sparkles, Download, MessageCircle, Send, Globe, Camera } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { toPng } from 'html-to-image';

function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [session, setSession] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Estados para autenticación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Streaming');
  const [newBillingCycle, setNewBillingCycle] = useState('monthly');

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
      .select('hourly_rate')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setHourlyRate(data.hourly_rate || 12);
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

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!newName || !newAmount || !session) return;

    const newSub = {
      user_id: session.user.id,
      name: newName,
      amount: parseFloat(newAmount),
      billing_cycle: newBillingCycle,
      category: newCategory,
      next_payment_date: new Date().toISOString().split('T')[0]
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

  // Función para obtener el slug exacto del icono oficial en Simple Icons
  const getServiceSlug = (name) => {
    const n = name.toLowerCase().trim();
    if (n.includes('netflix')) return 'netflix';
    if (n.includes('spotify')) return 'spotify';
    if (n.includes('disney')) return 'disneyplus';
    if (n.includes('hbo') || n.includes('max')) return 'hbo';
    if (n.includes('chatgpt') || n.includes('openai')) return 'openai';
    if (n.includes('prime') || n.includes('amazon')) return 'amazonprime';
    if (n.includes('youtube')) return 'youtube';
    if (n.includes('apple')) return 'apple';
    if (n.includes('twitch')) return 'twitch';
    if (n.includes('github')) return 'github';
    if (n.includes('discord')) return 'discord';
    if (n.includes('steam')) return 'steam';
    return null;
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
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              SubSplitter Media
            </h1>
            <p className="text-sm text-slate-400">Controla tus micro-pagos y fugas de dinero</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 font-semibold px-3.5 py-2 rounded-lg transition-all text-sm shrink-0"
              title="Generar cartel para redes sociales"
            >
              <Share2 size={16} /> Cartel RRSS
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-all text-sm shrink-0"
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

        {/* Lista de Suscripciones y Filtros */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-200">Tus Suscripciones Activas</h2>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + ["Servicio,Precio,Ciclo,Categoría"].concat(
                        subscriptions.map(s => `${s.name},${s.amount},${s.billing_cycle},${s.category}`)
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
                const iconSlug = getServiceSlug(sub.name);
                return (
                  <div key={sub.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-2">
                        {iconSlug ? (
                          <img 
                            src={`https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${iconSlug}.svg`} 
                            alt={sub.name} 
                            className="w-full h-full filter invert brightness-200" 
                          />
                        ) : (
                          <span className="font-bold text-emerald-400 text-sm">
                            {sub.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-200">{sub.name}</h3>
                        <span className="inline-block text-xs px-2 py-0.5 mt-1 rounded-full bg-slate-800 text-slate-300">
                          {sub.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
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

              {/* El Cartel (Tarjeta PNG) */}
              <div ref={cardRef} className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
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

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                  subsplitter-media.vercel.app
                </div>
              </div>

              {/* Botón de descarga de imagen */}
              <button
                onClick={downloadCardAsImage}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={16} /> Descargar Cartel (PNG)
              </button>

              {/* Botones de Compartir Directo en RRSS */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 block text-center mb-2">O comparte directamente un mensaje:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Botón X (Twitter) */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`📉 Mis suscripciones suman ${totalMonthly.toFixed(2)}€ (${hoursOfWork}h de trabajo al mes). ¡Controlando mis fugas de dinero con SubSplitter Media! 🚀`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-black hover:bg-slate-950 border border-slate-800 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <Globe size={14} /> Compartir en X
                  </a>

                  {/* Botón Instagram (Descarga + Copia de Texto) */}
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
                  {/* Botón WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`📉 ¡Mira mis gastos en suscripciones! Gasto ${totalMonthly.toFixed(2)}€ al mes (${hoursOfWork} horas de trabajo). Descubre SubSplitter Media.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>

                  {/* Botón Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://subsplitter-media.vercel.app')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <Send size={14} / > Facebook
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
                    placeholder="Ej: Netflix, Spotify, Disney Plus..." 
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