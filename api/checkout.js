export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" })
    }

    try {

        const { items } = req.body

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Itens inválidos" })
        }

        const response = await fetch(
            "https://api.mercadopago.com/checkout/preferences",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({

                    items: items.map(item => ({
                        title: String(item.name),
                        quantity: 1,
                        unit_price: Number(item.price),
                        currency_id: "BRL"
                    })),

                    payment_methods: {
                        installments: 1
                    },

                    back_urls: {
                        success: "",
                        failure: "https://project-qu3is.vercel.app",
                        pending: "https://project-qu3is.vercel.app"
                    },

                    auto_return: "approved"

                })
            }
        )

        const data = await response.json()

        if (!response.ok) {
            return res.status(400).json(data)
        }

        res.status(200).json({
            url: data.init_point
        })

    } catch (error) {

        res.status(500).json({
            error: error.message
        })

    }

}