exports.handler = async (event) => {
    const { email } = JSON.parse(event.body);

    // Add logic to send email or save to a database
    console.log(`New subscriber: ${email}`);

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
    };
};