// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================
const _URL = 'https://pqrtxbcaxnlcqurzmryi.supabase.co';
const _KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnR4YmNheG5sY3F1cnptcnlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzQ3MTksImV4cCI6MjA4ODIxMDcxOX0.e59ULROS4rI9xh-YFyarJimHX4ntNeqq7zNmgWBFKow';
const _supabase = supabase.createClient(_URL, _KEY);

// ============================================================
// ESTADO GLOBAL
// ============================================================
let produtosDisponiveis = [];
let cart = JSON.parse(localStorage.getItem('meuCarrinho')) || [];

// ============================================================
// INICIALIZAÇÃO
// ============================================================
window.onload = async () => {
    await carregarProdutosDoBanco();
    updateCart();
    await verificarPagamento();
};

// ============================================================
// CARREGAR PRODUTOS DO SUPABASE
// ============================================================
async function carregarProdutosDoBanco() {
    try {
        const { data, error } = await _supabase.from('produtos').select('*');
        if (error) throw error;

        if (data) {
            produtosDisponiveis = data;
            const grid = document.querySelector('.products-grid');
            const categoriaAtual = grid?.dataset?.categoria || 'contas';
            navegar(categoriaAtual);
        }
    } catch (err) {
        console.error('Erro ao carregar produtos:', err.message);
    }
}

// ============================================================
// VITRINE — NAVEGAR POR CATEGORIA
// ============================================================
function navegar(categoria) {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;

    grid.dataset.categoria = categoria;

    const menu = document.getElementById('side-menu');
    if (menu) menu.style.width = '0';

    grid.innerHTML = '';

    const filtrados = produtosDisponiveis.filter(p =>
        (p.categoria || '').toLowerCase().trim() === categoria.toLowerCase().trim()
    );

    if (filtrados.length === 0) {
        grid.innerHTML = `<p class="empty-msg">Nenhum item em "${categoria}"</p>`;
        return;
    }

    filtrados.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const temEstoque = prod.estoque > 0;

        card.innerHTML = `
           <img src="${prod.imagem_url || 'https://pqrtxbcaxnlcqurzmryi.supabase.co/storage/v1/object/public/produtos/WhatsApp%20Image%202026-03-02%20at%2020.38.12.jpeg'}">
            <h3>${prod.nome || 'Produto'}</h3>
            <p class="preco">R$ ${(parseFloat(prod.preco) || 0).toFixed(2)}</p>
            <p class="estoque ${temEstoque ? 'ok' : 'esgotado'}">
                ${temEstoque ? `✔ ${prod.estoque} em estoque` : '✖ Esgotado'}
            </p>
            <button class="btn-info" onclick="verInfo(${prod.id})">Ver Informações</button>
        `;

        grid.appendChild(card);
    });
    controlarBotoes(categoria); // ADICIONA ESSA LINHA NO FINAL
}
function controlarBotoes(categoria) {
    const btnPix = document.querySelector('[onclick="pagarPix()"]');
    const btnMP = document.getElementById('btn-finalizar');
    const btnWhats = document.getElementById('btn-whatsapp'); // vou explicar abaixo

    const ehWhatsapp = categoria === 'permanentes' || categoria === 'gamepass';

    if (btnPix) btnPix.style.display = ehWhatsapp ? 'none' : 'block';
    if (btnMP)  btnMP.style.display  = ehWhatsapp ? 'none' : 'block';
    if (btnWhats) btnWhats.style.display = ehWhatsapp ? 'block' : 'none';
}

// ============================================================
// MODAL DE INFORMAÇÕES DO PRODUTO
// ============================================================
function verInfo(id) {
    const produto = produtosDisponiveis.find(p => p.id == id);
    if (!produto) return;

    const modal = document.getElementById('info-modal');
    const infoDiv = document.getElementById('info-detalhes');
    const btnConfirmar = document.getElementById('btn-confirmar-add');

    infoDiv.innerHTML = `
        <img src="${produto.imagem_url}"" style="width:150px;border-radius:10px;display:block;margin:auto;">
        <h2 style="color:#00d4ff;margin-top:15px;">${produto.nome}</h2>
        <p style="color:#00ff88;font-weight:bold;">Estoque: ${produto.estoque}</p>
        <h3>R$ ${(parseFloat(produto.preco) || 0).toFixed(2)}</h3>
    `;

    if (produto.estoque > 0) {
        btnConfirmar.style.display = 'block';
        btnConfirmar.onclick = () => { addToCart(id); fecharInfo(); };
    } else {
        btnConfirmar.style.display = 'none';
        infoDiv.innerHTML += `<p style="color:#ff4444;font-weight:bold;">ITEM ESGOTADO</p>`;
    }

    modal.style.display = 'flex';
}

// ============================================================
// CARRINHO — ADICIONAR
// ============================================================
function addToCart(id) {
    const produto = produtosDisponiveis.find(p => p.id == id);
    if (!produto) return;

    const qtdNoCarrinho = cart.filter(i => i.id == id).length;
    if (qtdNoCarrinho >= parseInt(produto.estoque)) {
        return alert('Desculpe, não há mais unidades disponíveis.');
    }

    if (cart.length > 0) {
        const primeiro = produtosDisponiveis.find(p => p.id == cart[0].id);
        if (primeiro && primeiro.categoria !== produto.categoria) {
            return alert('Você não pode misturar categorias diferentes no carrinho.');
        }
    }

    localStorage.setItem('ultimoProduto', id);

    cart.push({ id: id, name: produto.nome, price: parseFloat(produto.preco) });
    saveAndRefresh();
    alert('Adicionado ao carrinho! ✅');
}

// ============================================================
// CARRINHO — REMOVER
// ============================================================
function removeFromCart(index) {
    cart.splice(index, 1);
    saveAndRefresh();
}

// ============================================================
// FINALIZAR COMPRA — MERCADO PAGO (checkout externo)
// ============================================================
async function finalizarCompra() {
    if (cart.length === 0) return alert('Seu carrinho está vazio!');

    const btn = document.getElementById('btn-finalizar');
    btn.innerText = 'Processando...';
    btn.disabled = true;

    const primeiroProduto = produtosDisponiveis.find(p => p.id == cart[0].id);

    // Categorias que vão para WhatsApp
    if (primeiroProduto && (primeiroProduto.categoria === 'permanentes' || primeiroProduto.categoria === 'gamepass')) {
        enviarWhatsapp(primeiroProduto);
        cart = [];
        saveAndRefresh();
        btn.innerText = 'Pagar com Mercado Pago';
        btn.disabled = false;
        return;
    }

    const items = cart.map(item => ({
        id: item.id,
        title: String(item.name),
        quantity: 1,
        unit_price: Number(parseFloat(item.price).toFixed(2))
    }));

    try {
        const { data, error } = await _supabase.functions.invoke('smooth-api', {
            body: { items, external_reference: String(Date.now()) }
        });

        if (error || !data || !data.url) throw new Error(data?.error || 'Erro ao gerar pagamento');

        localStorage.setItem('carrinhoEntrega', JSON.stringify(cart));
        window.location.href = data.url;

    } catch (err) {
        alert('Falha no pagamento: ' + err.message);
        btn.innerText = 'Pagar com Mercado Pago';
        btn.disabled = false;
    }
}

// ============================================================
// PAGAR COM PIX — abre modal de dados do cliente
// ============================================================
function pagarPix() {
    if (cart.length === 0) return alert('Seu carrinho está vazio!');
    abrirModalDados();
}

function abrirModalDados() {
    // Remove modal anterior se existir
    const existing = document.getElementById('modal-dados-pix');
    if (existing) existing.remove();

    const total = cart.reduce((s, i) => s + i.price, 0).toFixed(2);

    const modal = document.createElement('div');
    modal.id = 'modal-dados-pix';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.85); display:flex;
        justify-content:center; align-items:center; z-index:9999;
    `;

    modal.innerHTML = `
        <div style="
            background:#111; border:1px solid #00d4ff33;
            border-radius:16px; padding:32px; max-width:380px;
            width:90%; text-align:center; color:white;
            box-shadow: 0 0 40px #00d4ff22;
        ">
            <h2 style="color:#00d4ff; margin-bottom:6px;">💠 Pagar com PIX</h2>
            <p style="color:#aaa; margin-bottom:24px;">Total: <strong style="color:white;">R$ ${total}</strong></p>

            <input id="pix-email" type="email" placeholder="Seu e-mail" style="
                width:100%; padding:12px; margin-bottom:12px;
                background:#1a1a1a; border:1px solid #333; border-radius:8px;
                color:white; font-size:15px; box-sizing:border-box;
            ">

            <input id="pix-cpf" type="text" placeholder="CPF (só números)" maxlength="11" style="
                width:100%; padding:12px; margin-bottom:20px;
                background:#1a1a1a; border:1px solid #333; border-radius:8px;
                color:white; font-size:15px; box-sizing:border-box;
            ">

            <button onclick="confirmarPix()" style="
                width:100%; padding:14px; background:#00bb77;
                border:none; border-radius:8px; color:white;
                font-size:16px; font-weight:bold; cursor:pointer; margin-bottom:10px;
            ">Gerar QR Code PIX</button>

            <button onclick="document.getElementById('modal-dados-pix').remove()" style="
                width:100%; padding:12px; background:transparent;
                border:1px solid #444; border-radius:8px; color:#aaa;
                font-size:14px; cursor:pointer;
            ">Cancelar</button>
        </div>
    `;

    document.body.appendChild(modal);
}

async function confirmarPix() {
    const email = document.getElementById('pix-email').value.trim();
    const cpf = document.getElementById('pix-cpf').value.replace(/\D/g, '');

    if (!email || !email.includes('@')) return alert('Digite um e-mail válido.');
    if (cpf.length !== 11) return alert('Digite um CPF válido com 11 números.');

    const btn = document.querySelector('#modal-dados-pix button');
    btn.innerText = 'Gerando PIX...';
    btn.disabled = true;

    try {
        // TROCA PARA (chamando Vercel):
const response = await fetch('/api/pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart, email, cpf })
})
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Salva o pedido no Supabase para o webhook identificar
        await _supabase.from('pedidos').insert({
            payment_id: String(data.payment_id),
            carrinho: cart,
            email: email,
            entregue: false
        });

        localStorage.setItem('pixPaymentId', data.payment_id);
        localStorage.setItem('carrinhoEntrega', JSON.stringify(cart));

        // Fecha o modal de dados e abre o QR Code
        document.getElementById('modal-dados-pix').remove();
        mostrarPix(data);

    } catch (err) {
        alert('Erro ao gerar PIX: ' + err.message);
        btn.innerText = 'Gerar QR Code PIX';
        btn.disabled = false;
    }
}

// ============================================================
// EXIBIR QR CODE DO PIX
// ============================================================
function mostrarPix(data) {
    if (!data || !data.qr || !data.qr_base64) {
        alert('Erro ao gerar PIX. Tente novamente.');
        return;
    }

    const existing = document.getElementById('modal-qr-pix');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-qr-pix';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.9); display:flex;
        justify-content:center; align-items:center; z-index:9999;
    `;

    modal.innerHTML = `
        <div style="
            background:#111; border:1px solid #00bb7733;
            border-radius:16px; padding:32px; max-width:360px;
            width:90%; text-align:center; color:white;
            box-shadow: 0 0 40px #00bb7722;
        ">
            <h2 style="color:#00bb77; margin-bottom:4px;">✅ PIX Gerado!</h2>
            <p style="color:#aaa; margin-bottom:20px; font-size:14px;">
                Escaneie o QR Code ou copie o código abaixo
            </p>

            <img src="data:image/png;base64,${data.qr_base64}"
                style="width:220px; border-radius:8px; background:white; padding:8px;">

            <p style="color:#aaa; font-size:13px; margin:16px 0 6px;">Código Pix Copia e Cola:</p>

            <textarea id="pixCode" readonly style="
                width:100%; height:70px; background:#1a1a1a;
                border:1px solid #333; border-radius:8px;
                color:#00bb77; font-size:12px; padding:8px;
                box-sizing:border-box; resize:none;
            ">${data.qr}</textarea>

            <button onclick="copiarPix()" style="
                width:100%; padding:13px; background:#00bb77;
                border:none; border-radius:8px; color:white;
                font-size:15px; font-weight:bold; cursor:pointer;
                margin-top:12px; margin-bottom:8px;
            ">📋 Copiar código PIX</button>

            <button onclick="document.getElementById('modal-qr-pix').remove()" style="
                width:100%; padding:11px; background:transparent;
                border:1px solid #444; border-radius:8px; color:#aaa;
                font-size:14px; cursor:pointer;
            ">Fechar</button>

            <p style="color:#666; font-size:12px; margin-top:16px;">
                Após o pagamento, sua conta será entregue automaticamente. 🎉
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    // Verifica o pagamento a cada 10 segundos
    iniciarVerificacaoAutomatica(data.payment_id);
}

// ============================================================
// VERIFICAÇÃO AUTOMÁTICA DO PAGAMENTO (polling)
// ============================================================
function iniciarVerificacaoAutomatica(paymentId) {
    let tentativas = 0;
    const maxTentativas = 36; // 6 minutos

    const intervalo = setInterval(async () => {
        tentativas++;

        try {
            const { data } = await _supabase
                .from('pedidos')
                .select('entregue, conta_entregue')
                .eq('payment_id', String(paymentId))
                .single();

            if (data && data.entregue) {
                clearInterval(intervalo);

                // Fecha o modal do PIX se ainda estiver aberto
                const modalPix = document.getElementById('modal-qr-pix');
                if (modalPix) modalPix.remove();

                // Mostra a conta entregue
                mostrarConta(data.conta_entregue);

                // Limpa o carrinho
                cart = [];
                localStorage.removeItem('carrinhoEntrega');
                localStorage.removeItem('pixPaymentId');
                saveAndRefresh();
            }
        } catch (e) {
            // Silencia erros de polling
        }

        if (tentativas >= maxTentativas) clearInterval(intervalo);

    }, 10000); // a cada 10 segundos
}

// ============================================================
// VERIFICAR PAGAMENTO VIA URL (redirect do Mercado Pago)
// ============================================================
async function verificarPagamento() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'approved') {
        const carrinho = JSON.parse(localStorage.getItem('carrinhoEntrega'));

        if (carrinho) {
            for (const item of carrinho) {
                await entregarConta(item.id);
            }
            localStorage.removeItem('carrinhoEntrega');
        }

        // Limpa a URL sem recarregar
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ============================================================
// ENTREGA DE CONTA
// ============================================================
async function entregarConta(produto_id) {
    const { data, error } = await _supabase
        .from('estoque_contas')
        .select('*')
        .eq('produto_id', produto_id)
        .eq('status', 'disponivel')
        .limit(1)
        .single();

    if (error || !data) return alert('Nenhuma conta disponível no momento.');

    await _supabase
        .from('estoque_contas')
        .update({ status: 'vendido' })
        .eq('id', data.id);

    mostrarConta(data.dados_contas);
    carregarProdutosDoBanco();
}

// ============================================================
// EXIBIR CONTA ENTREGUE
// ============================================================
function mostrarConta(dados) {
    document.getElementById('usuarioConta').innerText = dados;
    document.getElementById('entregaConta').style.display = 'flex';
    localStorage.setItem('ultimaConta', dados);
    localStorage.removeItem('ultimoProduto');
}

function fecharConta() {
    document.getElementById('entregaConta').style.display = 'none';
}

function copiarConta() {
    const texto = document.getElementById('usuarioConta').innerText;
    navigator.clipboard.writeText(texto).then(() => alert('Conta copiada! ✅'));
}

// ============================================================
// NOTIFICAÇÃO DE CONTAS ANTERIORES
// ============================================================
function abrirNotificacao() {
    const conta = localStorage.getItem('ultimaConta');
    const lista = document.getElementById('listaContas');
    lista.innerText = conta || 'Nenhuma conta encontrada';
    document.getElementById('notificacaoConta').style.display = 'block';
}

function fecharNotificacao() {
    document.getElementById('notificacaoConta').style.display = 'none';
}

// ============================================================
// WHATSAPP — PERMANENTES E GAMEPASS
// ============================================================
function enviarWhatsapp(produto) {
    if (produto.categoria !== 'permanentes' && produto.categoria !== 'gamepass') return;

    const numero = '5527997924053';
    const mensagem = `Olá, quero comprar:\n\n🛒 Produto: ${produto.nome}\n💰 Preço: R$ ${parseFloat(produto.preco).toFixed(2)}\n\nAguardando instruções de pagamento.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function fecharInfo() {
    document.getElementById('info-modal').style.display = 'none';
}

function saveAndRefresh() {
    localStorage.setItem('meuCarrinho', JSON.stringify(cart));
    updateCart();
}

function toggleCart() {
    const m = document.getElementById('cart-modal');
    m.style.display = (m.style.display === 'none' || m.style.display === '') ? 'flex' : 'none';
}

function toggleMenu() {
    const menu = document.getElementById('side-menu');
    if (!menu) return;
    menu.style.width = menu.style.width === '250px' ? '0' : '250px';
}

function updateCart() {
    const list = document.getElementById('cart-items');
    if (!list) return;

    let total = 0;
    list.innerHTML = '';

    cart.forEach((item, i) => {
        total += item.price;
        list.innerHTML += `
            <li class="cart-item">
                <span>${item.name}</span>
                <span>R$ ${item.price.toFixed(2)}</span>
                <button class="remove" onclick="removeFromCart(${i})">✕</button>
            </li>
        `;
    });

    const count = document.getElementById('cart-count');
    const totalDisp = document.getElementById('cart-total');
    if (count) count.innerText = cart.length;
    if (totalDisp) totalDisp.innerText = total.toFixed(2);
}

function copiarPix() {
    const textarea = document.getElementById('pixCode');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => alert('PIX copiado! ✅'));
}
function irParaWhatsapp() {
    if (cart.length === 0) return alert('Carrinho vazio!');
    const produto = produtosDisponiveis.find(p => p.id == cart[0].id);
    if (produto) enviarWhatsapp(produto);
}