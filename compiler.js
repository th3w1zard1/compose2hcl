const __lex = {
    line: 1,
    scope: 0,
    buffer: "",
    next: undefined
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
}

function lex_setup( input ) {
    out_reset();

    // Reset the lexer internals
    __lex.line = 1;
    __lex.scope = 0;
    __lex.buffer = input.split('');
    __lex.next = lex_nextToken();

    // Reset the output internals
    __out.prefix = '';
}

function lex_acceptChar( _char ) {
    console.log( __lex.buffer[0], __lex.buffer.length );
    if( __lex.buffer[0] === undefined )
        throw "Lexer buffer reached an undefined head state, HALT!";
    if( __lex.buffer.length > 0 && __lex.buffer[0] !== undefined, __lex.buffer[0] === _char ) {
        __lex.buffer.shift();
        return true;
    }
    return false;
}

function lex_hasNext() {
    return __lex.next !== undefined;
}

function lex_nextToken() {

    if( __lex.buffer.length === 0 ) {
        __lex.next = undefined;
        return undefined;
    }

    // Linebreaks, non-skipping, internal tracking
    while( lex_acceptChar( '\n' ) ) {
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
    if( __lex.next.type !== type )
        throw "Unexpected token error, expected type '" +type+ "', but read type '" +__lex.next.type+ "' -> " +JSON.stringify(__lex.next);
    
    if( value !== null && __lex.next.value !== value )
        throw "Unexpected token error, expected value '" +value+ "', but read type '" +__lex.next.value+ "' -> " +JSON.stringify(__lex.next);
    
    console.log( "Token:", JSON.stringify(__lex.next) );

    oldToken = __lex.next;
    __lex.next = lex_nextToken();
    return oldToken;
}

function cc_version() {
    lex_acceptToken( 'version' );
    let version = lex_acceptToken();
}

function cc_service_list() {
    let root = lex_acceptToken( 'services' );

    out_append( 'group "services" {', 2 );

    while( __lex.next.scope === root.scope+2 ) {
        cc_service();
    }
    console.log( "No more services...", __lex.next );

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
        ports: {}
    };

    while( __lex.next.scope === root.scope+2 ) {
        let directive = lex_acceptToken();
        console.log( "Directive", directive.value );
        switch( directive.value ) {
            case 'image':
                service_info.image = lex_acceptToken().value;
                break;
            
            case 'build': // Unsupported by nomad
                console.warn( "Unsupported directive: build" );
                lex_acceptToken(); // Consume and skip
                break;

            case 'depends_on':
                console.warn( "Unsupported directive: depends_on" );
                cc_consume_scope( directive.scope+2 );
                break;
            
            case 'ports':
                cc_service_ports( service_info.ports );
                break;
            
            case 'deploy':
                console.warn( "Unsupported directive: deploy" );
                cc_consume_scope( directive.scope+2 );
                break;
            
            case 'labels':
                console.warn( "Unsupported directive: labels" );
                cc_consume_scope( directive.scope+2 );
                break;
            
            case 'environment':
                console.warn( "Missing support for: environment" );
                cc_consume_scope( directive.scope+2 );
                break;
            
            case 'volumes':
                console.warn( "Missing support for: volumes" );
                cc_consume_scope( directive.scope+2 );
                break;

            default:
                console.warn( 'Missing directive handler:', directive.value );
        }
        console.log( "No more directives..." );
    }

    // Write-out the ports
    if( Object.keys(service_info.ports).length > 0 ) {

        out_append( 'network {', 2 );

        Object.keys(service_info.ports).forEach(port => {
            let info = service_info.ports[port];
            out_append( 'port "' +port+ '" {', 2 );
            out_append( 'static = '+info.outer, -2 );
            out_append( '}' );
        });

        out_indent( -2 );
        out_append( '}' );
    }

    // Write the config object
    out_append( 'config {', 2 );

    out_append( 'image = "' +service_info.image+ '"' );
    out_append( 'image_pull_timeout = "10m"' );
    out_append( 'force_pull = true' );
    out_append( 'ports = ' +JSON.stringify(Object.keys(service_info.ports)) );

    out_indent( -2 );
    out_append( '}' );

    out_indent( -2 );
    out_append( '}' )
    //
}

function cc_service_ports( ports ) {
    let index = 0;

    while( __lex.next.value === '-' ) {
        lex_acceptToken( '-' );
        let portDef = lex_acceptToken()
                        .value
                        .replace(/['"]+/g, '')
                        .split(':');

        ports[ 'port'+index ] = {
            inner: parseInt( portDef[0] ),
            outer: parseInt( portDef[1] )
        }
        index++;
    }
}

function cc_consume_scope( scope ) {
    while( lex_hasNext() && __lex.next.scope >= scope ) {
        console.warn( "SKIP", __lex.next.scope, scope );
        lex_acceptToken();
    }
}
