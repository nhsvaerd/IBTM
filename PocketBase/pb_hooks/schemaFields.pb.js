const schemaFields = {
    registrant: {
        id: () => z.string().min(8).max(64),
        name: () => z.string().min(1).max(200),
        email: () => z.string().email().max(254),
        isHost: () => z.bool(),
    },
    event: {
        id: () => z.string().min(8).max(64),
        title: () => z.string().min(1).max(200),
        startTime: () => z.datetime(),
    },
}