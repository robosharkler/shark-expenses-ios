const parseExpense = (value, index) => {
    return {
        id: `Expenses!A${index + 2}`,
        date: value[0],
        description: value[1],
        category: value[3],
        amount: value[4].replace(",", ""),
        account: value[2]
    };
}

const formatExpense = (expense) => {
    return [
        `=DATE(${expense.date.substr(0, 4)}, ${expense.date.substr(
            5,
            2
        )}, ${expense.date.substr(-2)})`,
        expense.description,
        expense.account,
        expense.category,
        expense.amount
    ];
}

const append = (expense, spreadsheetId) => {
    return window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: "Expenses!A1",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        values: [formatExpense(expense)]
    });
}

const update = (expense, spreadsheetId) => {
    return window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: expense.id,
        valueInputOption: "USER_ENTERED",
        values: [formatExpense(expense)]
    });
}

export {update, append, formatExpense, parseExpense}