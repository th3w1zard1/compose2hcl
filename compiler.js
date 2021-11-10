const __lex = {
    line: 1,
    scope: 0,
    buffer: ""
};

const __out = {
    depth: 0
};

function out_reset() {
    document.getElementById( 'hcl-output' ).value = "";
}
function out_indent( depth ) {
    __out.depth += depth;
    if( __out.depth < 0 )
        __out.depth = 0;
}
function out_append( text = '', depth = 0 ) {
    document.getElementById( 'hcl-output' ).value += ' '.repeat(__out.depth) + text + '\n';
    out_indent( depth );
}

function compile() {
    lex_setup( document.getElementById( 'compose-input' ).value );

    try {
        out_append( "job \"docker-compose\" {", 2 );

        out_append( 'region = "global"' );
        out_append( 'datacenters = [ "dc1" ]' );
        out_append( 'type = "service"\n' );

        out_append( '# Specify this job to have rolling updates, two-at-a-time, with' );
        out_append( '# 10 second intervals.' );
        out_append( 'update {', 2 );
        out_append( 'stagger      = "10s"' );
        out_append( 'max_parallel = 2' );
        out_indent( -2 );
        out_append( '}\n' );

        cc_version();
        cc_service_list();

        out_indent( -2 );
        out_append( "}" )
    }
    catch( err ) {
        out_append( "ERR-STOP: " + err );
        alert( err );
    }

    out_append( '\nEnd of parse....', '' )

    out_append( JSON.stringify(lex_nextToken()) );
    out_append( JSON.stringify(lex_nextToken()) );
    out_append( JSON.stringify(lex_nextToken()) );
    out_append( JSON.stringify(lex_nextToken()) );
    out_append( JSON.stringify(lex_nextToken()) );
}

function lex_setup( input ) {
    out_reset();

    // Reset the lexer internals
    __lex.line = 1;
    __lex.scope = 0;
    __lex.buffer = input.split('');

    // Reset the output internals
    __out.prefix = '';
}

function lex_acceptChar( _char ) {
    if( __lex.buffer[0] === _char ) {
        __lex.buffer.shift();
        return true;
    }
    return false;
}

function lex_hasNext() {
    return __lex.buffer.length > 0;
}

function lex_nextToken() {

    if( !lex_hasNext() )
        return null;

    // Linebreaks, non-skipping, internal tracking
    if( lex_acceptChar( '\n' ) ) {
        __lex.line++;
        __lex.scope = 0;
    }

    // whitespace
    if( __lex.scope === 0 && lex_acceptChar( ' ' ) ) {
        __lex.scope = 1;
        while( lex_acceptChar( ' ' ) )
            __lex.scope++;
    }
    else if( lex_acceptChar( ' ' ) ) { // Skip subsequent spaces...
        while( lex_acceptChar( ' ' ) );
    }

    // non-whitespace
    let token = {
        type:'text',
        value:'',
        line:__lex.line,
        scope: __lex.scope
    };
    while( __lex.buffer[0] !== ' ' && __lex.buffer[0] !== '\n' ) {
        token.value += __lex.buffer[0];
        lex_acceptChar( __lex.buffer[0] );
    }

    if( token.value.endsWith(':') )
        token.value = token.value.slice( 0, -1 );

    return token;
}

function lex_acceptToken( value = null, type = 'text' ) {
    let token = lex_nextToken();
    if( token.type !== type )
        throw "Unexpected token error, expected type '" +type+ "', but read type '" +token.type+ "' -> " +JSON.stringify(token);
    
    if( value !== null && token.value !== value )
        throw "Unexpected token error, expected value '" +value+ "', but read type '" +token.value+ "' -> " +JSON.stringify(token);
    
    console.log( "Token:", JSON.stringify(token) );

    return token;
}

function cc_version() {
    lex_acceptToken( 'version' );
    let version = lex_acceptToken();
}

function cc_service_list() {
    lex_acceptToken( 'services' );

    out_append( 'group "services" {', 2 );

    cc_service();

    out_indent( -2 );
    out_append( '}' );
}

function cc_service() {
    let root = lex_acceptToken(); // skip the ':'
    let name = root.value;

    out_append( 'task "' +name+ '" {', 2 );
    out_append( 'driver = "docker"' );
    out_append();

    let service_info = {
        image: null,
        ports: []
    };

    while( __lex.scope >= root.scope ) {
        let directive = lex_acceptToken();
        console.log( "Directive", directive );
        switch( directive.value ) {
            case 'image':
                service_info.image = cc_service_image();
                break;
            
            case 'build': // Unsupported by nomad
                lex_acceptToken(); // Consume and skip
                break;

            case 'depends_on':
                break;
            
            case 'ports':
                break;
            
            case 'deploy':
                break;

            default:
                out_append( 'Missing directive handler: ' +JSON.stringify(directive) );
        }
    }

    // Write the config object
    out_append( 'config {', 2 );

    out_append( 'image = "' +service_info.image+ '"' );
    out_append( 'image_pull_timeout = "10m"' );
    out_append( 'force_pull = true' );

    out_indent( -2 );
    out_append( '}' );

    out_indent( -2 );
    out_append( '}' )
    //
}

function cc_service_image() {
    return lex_acceptToken( null, 'text' ).value;
}