module 0x0::zkrelief {
    use std::string::{String};
    use sui::ecvrf::{ ecvrf_verify };
    use sui::event;
    use sui::vec_map::{VecMap};
    use sui::vec_map;
    use sui::clock::{Clock};

    public struct CrisisReport has copy, drop, store {
        id: u64,
        content: String,
        submitted_at: u64,
    }

    public struct SuggestedRemedy has key, store {
        id: UID,
        content: String,
        submitted_at: u64,
    }

    public struct Patient has key, store {
        id: UID,
        address: address,
        name: String,
        photo: Option<String>,
        suggested_remedy: vector<SuggestedRemedy>,
    }

    public struct PatientHandler has key, store {
        id: UID,
        patient_vector: vector<Patient>,
    }

    public struct Counsellor has key, store {
        id: UID,
        address: address,
        name: String,
        photo: Option<String>,
        pending_crisis_report: VecMap<address, CrisisReport>,
    }

    public struct CounsellorHandler has key, store {
        id: UID,
        counsellor_vector: vector<Counsellor>,
    }

    public struct AdminCapability has key {
        id: UID,  
    }

    public struct CounsellorAddedEvent has copy, drop {
        counsellor_id: ID,
        address: address,
        name: String,
        photo: Option<String>,
    }

    public struct AllCounsellorDetailsEvent has copy, drop {
        address: vector<address>,
        name: vector<String>,
        photo: vector<Option<String>>,
        pending_crisis_report: vector<VecMap<address, CrisisReport>>,
    }

    public struct CounsellorCountEvent has copy, drop {
        count: u64,
    }

    public struct VerifiedEvent has copy, drop {
        is_verified: bool,
    }

    public struct RemedySuggestedEvent has copy, drop {
        patient_address: address,
        remedy_id: ID,
        content: String,
    }

    public struct CrisisReportAddedEvent has copy, drop {
        counsellor_address: address,
        patient_address: address,
        report_id: u64,
        randomness: u64,
        content: String,
    }

    fun init (ctx: &mut TxContext) {
        transfer::transfer(
            AdminCapability {
                id: object::new(ctx),
            },
            tx_context::sender(ctx));

        transfer::share_object(
            CounsellorHandler {
                id: object::new(ctx),
                counsellor_vector: vector::empty(),
            }
        );

        transfer::share_object(
            PatientHandler {
                id: object::new(ctx),
                patient_vector: vector::empty(),
            }
        );
    }

    fun get_current_timestamp(clock: &Clock): u64 {
        clock.timestamp_ms()
    }

    public entry fun create_counsellor(
        _admin : &AdminCapability,
        handler: &mut CounsellorHandler, 
        address: address, 
        name: String, 
        photo: Option<String>,
        ctx: &mut TxContext
    ) {
        let counsellor = Counsellor {
            id: object::new(ctx),
            address,
            name: name,
            photo: photo,
            pending_crisis_report: vec_map::empty(),
        };

        let id = object::id(&counsellor);
        vector::push_back(&mut handler.counsellor_vector, counsellor);

        event::emit(CounsellorAddedEvent {
            counsellor_id: id,
            address,
            name,
            photo,
        });
    }

    public fun get_counsellor_count(handler: &CounsellorHandler){
        event::emit(CounsellorCountEvent {
            count: vector::length(&handler.counsellor_vector),
        });
    }

    fun bytes_to_u64(bytes: vector<u8>): u64 {
        assert!(vector::length(&bytes) >= 8, 0);
        let mut val = 0u64;
        let mut i = 0;
        while (i < 8) {
            let b = *vector::borrow(&bytes, i);
            val = (val << 8) | (b as u64);
            i = i + 1;
        };
        val
    }

    public entry fun add_crisis_report(
        counsellor_handler: &mut CounsellorHandler,
        patient_handler: &mut PatientHandler,
        clock: &Clock,
        output: vector<u8>,
        proof: vector<u8>,
        alpha_string: vector<u8>,
        public_key: vector<u8>,
        name: String,
        photo: Option<String>,
        content: String,
        ctx: &mut TxContext
    ) {
        let is_verified = ecvrf_verify(&output, &alpha_string, &public_key, &proof);

        assert!(is_verified, 1);
        let patient = Patient {
            id: object::new(ctx),
            address: tx_context::sender(ctx),
            name: name,
            photo: photo,
            suggested_remedy: vector::empty(),
        };
        vector::push_back(&mut patient_handler.patient_vector, patient);
        

        let randomness = bytes_to_u64(output);

        let total = vector::length(&counsellor_handler.counsellor_vector);
        assert!(total > 0, 2);

        let index = randomness % total;

        let report = CrisisReport {
            id: randomness,
            content: content,
            submitted_at: get_current_timestamp(clock),
        };

        let counsellor_ref_mut = vector::borrow_mut(&mut counsellor_handler.counsellor_vector, index);
        let patient_address = tx_context::sender(ctx);
        vec_map::insert(&mut counsellor_ref_mut.pending_crisis_report, patient_address, report);

        event::emit(CrisisReportAddedEvent {
            counsellor_address: counsellor_ref_mut.address,
            patient_address,
            report_id: randomness,
            randomness,
            content,
        });
    }

    entry public fun verify_ecvrf_output(
        output: vector<u8>, 
        alpha_string: vector<u8>, 
        public_key: vector<u8>, 
        proof: vector<u8>
    ) {
        event::emit(
            VerifiedEvent {
                is_verified: ecvrf_verify(&output, &alpha_string, &public_key, &proof)
            }
        );
    }

    public fun is_counsellor(handler: &CounsellorHandler, addr: address): bool {
        let len = vector::length(&handler.counsellor_vector);
        let mut i = 0;
        while (i < len) {
            let c = vector::borrow(&handler.counsellor_vector, i);
            if (c.address == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    entry public fun get_all_counsellors_details(handler: &CounsellorHandler) { 
        let mut addresses = vector::empty<address>();
        let mut names = vector::empty<String>();
        let mut photos = vector::empty<Option<String>>();
        let mut pending_crisis_reports = vector::empty<VecMap<address, CrisisReport>>();
        let len = vector::length(&handler.counsellor_vector);
        let mut i = 0;  
        while (i < len) {
            let c = vector::borrow(&handler.counsellor_vector, i);
            vector::push_back(&mut addresses, c.address);
            vector::push_back(&mut names, c.name);
            vector::push_back(&mut photos, c.photo);
            vector::push_back(&mut pending_crisis_reports, c.pending_crisis_report);
            i = i + 1;
        };
        event::emit(AllCounsellorDetailsEvent {
            address: addresses,
            name: names,
            photo: photos,
            pending_crisis_report: pending_crisis_reports,
        });    
    }

    public entry fun suggest_remedy(
       counsellor_handler: &mut CounsellorHandler,
       patient_handler: &mut PatientHandler,
       address: address,
       clock: &Clock,
       content: String,
       ctx: &mut TxContext
     ) {
       let sender = tx_context::sender(ctx);
       assert!(is_counsellor(counsellor_handler, sender), 4);

       let remedy = SuggestedRemedy {
           id: object::new(ctx),
           content: content,
           submitted_at: get_current_timestamp(clock),
       };
       let id = object::id(&remedy);

       let len = vector::length(&patient_handler.patient_vector);
       let mut i = 0;
       while (i < len) {
           let patient = vector::borrow_mut(&mut patient_handler.patient_vector, i);
           if (patient.address == address) {
               vector::push_back(&mut patient.suggested_remedy, remedy);
               event::emit(RemedySuggestedEvent {
                   patient_address: address,
                   remedy_id: id,
                   content,
               });
               return
           };
           i = i + 1;
       };
       abort 3
    }
} 
