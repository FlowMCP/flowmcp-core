class Print {
    static delay( ms ) { 
        return new Promise( ( resolve ) => setTimeout( resolve, ms ) ) 
    }

    static padRaw( str, length ) {
        const safeStr = String( str ?? '' )
        return safeStr.length > length
            ? safeStr.slice( 0, length - 1 ) + '…'
            : safeStr.padEnd( length, ' ' )
    }

    static colorize( text, color ) {
        const code = color === "green" ? "\x1b[32m" : "\x1b[31m"
        return `${code}${text}\x1b[0m`
    }

    static warn( text ) {
        console.warn( `${text}.` )
    }

    static log( text ) {
        console.log( text )
    }

    static headline() {
        console.log(
            Print.padRaw( 'Route Name', 26 ) +
            Print.padRaw( 'Status', 8 ) +
            Print.padRaw( 'Success', 10 ) +
            Print.padRaw( 'Message', 25 ) +
            'Data Preview'
        )
        console.log( '-'.repeat( 100 ) )
    }


    static row( { status, messages, dataAsString, routeName } ) {
        const statusRaw = Print.padRaw( status ? 'OK' : 'FAIL', 8 )
        const statusText = status
            ? Print.colorize( statusRaw, 'green' )
            : Print.colorize( statusRaw, 'red' )

        const preview = dataAsString ? dataAsString.substring( 0, 40 ) : '(no data)'

        let message
        message = Array.isArray( messages ) && messages.length > 0
            ? messages.map( a => { a = a.replace('Status: ', '' ).replace('Text: ', '' ); return a } ).join( ', ' )
            : ( typeof messages === 'string' && messages !== '' ? messages : '(empty)' )

        console.log(
            Print.padRaw( routeName, 26 ) +
            statusText +
            Print.padRaw( status.toString(), 10 ) +
            Print.padRaw( message, 25 ) +
            preview
        )
    }
}


export { Print }