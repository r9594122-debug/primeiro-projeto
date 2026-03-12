import { createClient } from "@supabase/supabase-js"

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" })
    }

    try {
        const { items, email, cpf } = req.body

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Itens inválidos" })
        }

        if (!email || !cpf) {
            return res.status(400).json({ error: "Email e CPF obrigatórios" })
        }

        const total = Number(items.reduce((sum, item) => {
            return sum + Number(item.price || item.unit_price || 0)
        }, 0).toFixed(2))

        const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": String(Date.now())
            },
            body: JSON.stringify({
                transaction_amount: total,
                description: items.map(i => i.name).join(", "),
                payment_method_id: "pix",
                external_reference: String(Date.now()),
                notification_url: "https://pqrtxbcaxnlcqurzmryi.supabase.co/functions/v1/webhook-pagamento",
                payer: {
                    email: email,
                    identification: {
                        type: "CPF",
                        number: cpf.replace(/\D/g, '')
                    }
                }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            return res.status(400).json(data)
        }

        // Salva o pedido no Supabase para o webhook entregar
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        await supabase.from("pedidos").insert({
            payment_id: String(data.id),
            carrinho: items,
            email: email,
            entregue: false
        })

        return res.status(200).json({
            qr: data?.point_of_interaction?.transaction_data?.qr_code,
            qr_base64: data?.point_of_interaction?.transaction_data?.qr_code_base64,
            payment_id: data.id
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Erro ao gerar PIX" })
    }
}
